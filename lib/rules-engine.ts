// Moteur de règles déterministe et explicable — lecture seule.
// Aucune règle ici ne déclenche d'action sur Google Ads : elle produit uniquement
// un constat, à valider humainement avant toute action réelle.

const SPEND_NO_CONVERSION_THRESHOLD_EUR = 50;
const CPA_DRIFT_THRESHOLD_PCT = 30;
const BUDGET_OVER_RATIO = 1.0;
const BUDGET_UNDER_RATIO = 0.3;

export type Finding = {
  id: string;
  campaignId: number;
  clientName: string;
  campaignName: string;
  rule:
    | "spend_no_conversion"
    | "cpa_drift"
    | "cpa_target_exceeded"
    | "budget_pace_over"
    | "budget_pace_under"
    | "no_clicks";
  severity: "warning" | "info" | "opportunity";
  title: string;
  detail: string;
  metric: string;
};

type Window = { spend: number; clicks: number; conversions: number };

export type CampaignForRules = {
  id: number;
  name: string;
  status: string;
  budgetMicros: number | null;
  clientName: string;
  clientSector: string | null;
  clientTargetCpa: number | null;
  last7: Window;
  prev7: Window;
  last14: Window;
};

function money(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

export function evaluateCampaign(c: CampaignForRules): Finding[] {
  const findings: Finding[] = [];
  const sectorLabel = c.clientSector ? ` (${c.clientSector})` : "";

  if (c.last14.spend >= SPEND_NO_CONVERSION_THRESHOLD_EUR && c.last14.conversions === 0) {
    findings.push({
      id: `spend_no_conversion-${c.id}`,
      campaignId: c.id,
      clientName: c.clientName,
      campaignName: c.name,
      rule: "spend_no_conversion",
      severity: "warning",
      title: `${c.name} dépense sans convertir`,
      detail: `${c.clientName}${sectorLabel} : ${money(c.last14.spend)} dépensés sur 14 jours, 0 conversion enregistrée.`,
      metric: `${money(c.last14.spend)} dépensés / 0 conversion`,
    });
  }

  const cpaLast7 = c.last7.conversions > 0 ? c.last7.spend / c.last7.conversions : null;
  const cpaPrev7 = c.prev7.conversions > 0 ? c.prev7.spend / c.prev7.conversions : null;

  if (cpaLast7 !== null && cpaPrev7 !== null && cpaPrev7 > 0) {
    const driftPct = ((cpaLast7 - cpaPrev7) / cpaPrev7) * 100;
    if (driftPct >= CPA_DRIFT_THRESHOLD_PCT) {
      findings.push({
        id: `cpa_drift-${c.id}`,
        campaignId: c.id,
        clientName: c.clientName,
        campaignName: c.name,
        rule: "cpa_drift",
        severity: "warning",
        title: `${c.name} : CPA en hausse`,
        detail: `${c.clientName}${sectorLabel} : CPA passé de ${money(cpaPrev7)} à ${money(cpaLast7)} (+${driftPct.toFixed(0)} %) entre les deux dernières semaines.`,
        metric: `${money(cpaPrev7)} → ${money(cpaLast7)}`,
      });
    }
  }

  if (c.clientTargetCpa && cpaLast7 !== null && cpaLast7 > c.clientTargetCpa) {
    findings.push({
      id: `cpa_target_exceeded-${c.id}`,
      campaignId: c.id,
      clientName: c.clientName,
      campaignName: c.name,
      rule: "cpa_target_exceeded",
      severity: "warning",
      title: `${c.name} dépasse l'objectif CPA`,
      detail: `${c.clientName}${sectorLabel} : CPA actuel ${money(cpaLast7)} au-dessus de l'objectif fixé à ${money(c.clientTargetCpa)}.`,
      metric: `${money(cpaLast7)} vs objectif ${money(c.clientTargetCpa)}`,
    });
  }

  if (c.status === "Active" && c.budgetMicros) {
    const budget = c.budgetMicros / 1_000_000;
    const avgDailySpend = c.last7.spend / 7;
    const ratio = budget > 0 ? avgDailySpend / budget : 0;

    if (ratio >= BUDGET_OVER_RATIO) {
      findings.push({
        id: `budget_pace_over-${c.id}`,
        campaignId: c.id,
        clientName: c.clientName,
        campaignName: c.name,
        rule: "budget_pace_over",
        severity: "warning",
        title: `${c.name} dépasse son budget quotidien`,
        detail: `${c.clientName}${sectorLabel} : dépense moyenne de ${money(avgDailySpend)}/jour sur 7 jours, au-dessus du budget de ${money(budget)}/jour.`,
        metric: `${money(avgDailySpend)}/j vs budget ${money(budget)}/j`,
      });
    } else if (ratio <= BUDGET_UNDER_RATIO) {
      findings.push({
        id: `budget_pace_under-${c.id}`,
        campaignId: c.id,
        clientName: c.clientName,
        campaignName: c.name,
        rule: "budget_pace_under",
        severity: "opportunity",
        title: `${c.name} sous-utilise son budget`,
        detail: `${c.clientName}${sectorLabel} : seulement ${money(avgDailySpend)}/jour dépensés sur 7 jours, pour un budget de ${money(budget)}/jour disponible.`,
        metric: `${money(avgDailySpend)}/j vs budget ${money(budget)}/j`,
      });
    }
  }

  if (c.status === "Active" && c.last7.clicks === 0) {
    findings.push({
      id: `no_clicks-${c.id}`,
      campaignId: c.id,
      clientName: c.clientName,
      campaignName: c.name,
      rule: "no_clicks",
      severity: "warning",
      title: `${c.name} : aucun clic depuis 7 jours`,
      detail: `${c.clientName}${sectorLabel} : la campagne est active mais n'a reçu aucun clic sur les 7 derniers jours.`,
      metric: "0 clic / 7 jours",
    });
  }

  return findings;
}

export function evaluateAllCampaigns(campaigns: CampaignForRules[]): Finding[] {
  return campaigns.flatMap(evaluateCampaign);
}
