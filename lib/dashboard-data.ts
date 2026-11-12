import { db } from "@/lib/db/client";
import { clients, campaigns, campaignMetrics } from "@/lib/db/schema";
import { evaluateAllCampaigns, type Finding } from "@/lib/rules-engine";

export type CampaignRow = {
  id: number;
  name: string;
  client: string;
  channel: string;
  status: "Active" | "En pause";
  spend: number;
  budget: number;
  clicks: number;
  conversions: number;
  cpa: number;
  trend: string;
};

export type ClientRow = {
  name: string;
  sector: string;
  campaigns: number;
  spend: string;
  status: string;
  initials: string;
  color: string;
};

type Window = { spend: number; clicks: number; conversions: number };

const CLIENT_COLORS = ["blue", "violet", "orange", "green"];

function money(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function emptyWindow(): Window {
  return { spend: 0, clicks: 0, conversions: 0 };
}

export async function getDashboardData() {
  const clientRows = await db.select().from(clients).orderBy(clients.name);
  const campaignRows = await db.select().from(campaigns);
  const metricRows = await db.select().from(campaignMetrics);

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(today.getDate() - 14);

  const byCampaign = new Map<number, { total: Window; last7: Window; prev7: Window; last14: Window }>();
  const byDate = new Map<string, { spend: number; conversions: number }>();

  for (const m of metricRows) {
    const cost = m.costMicros / 1_000_000;
    const conversions = Number(m.conversions);
    const d = new Date(m.date);

    const entry = byCampaign.get(m.campaignId) ?? {
      total: emptyWindow(),
      last7: emptyWindow(),
      prev7: emptyWindow(),
      last14: emptyWindow(),
    };

    entry.total.spend += cost;
    entry.total.clicks += m.clicks;
    entry.total.conversions += conversions;

    if (d >= fourteenDaysAgo) {
      entry.last14.spend += cost;
      entry.last14.clicks += m.clicks;
      entry.last14.conversions += conversions;
    }
    if (d >= sevenDaysAgo) {
      entry.last7.spend += cost;
      entry.last7.clicks += m.clicks;
      entry.last7.conversions += conversions;
    } else if (d >= fourteenDaysAgo) {
      entry.prev7.spend += cost;
      entry.prev7.clicks += m.clicks;
      entry.prev7.conversions += conversions;
    }

    byCampaign.set(m.campaignId, entry);

    const dayEntry = byDate.get(m.date) ?? { spend: 0, conversions: 0 };
    dayEntry.spend += cost;
    dayEntry.conversions += conversions;
    byDate.set(m.date, dayEntry);
  }

  const clientById = new Map(clientRows.map((c) => [c.id, c]));

  const campaignsOut: CampaignRow[] = campaignRows.map((c) => {
    const agg = byCampaign.get(c.id)?.total ?? emptyWindow();
    const client = clientById.get(c.clientId);
    const cpa = agg.conversions > 0 ? agg.spend / agg.conversions : 0;
    const win = byCampaign.get(c.id);
    const trendPct = win && win.prev7.spend > 0 ? ((win.last7.spend - win.prev7.spend) / win.prev7.spend) * 100 : null;

    return {
      id: c.id,
      name: c.name,
      client: client?.name ?? "Client inconnu",
      channel: c.channel ?? "Search",
      status: c.status === "En pause" ? "En pause" : "Active",
      spend: agg.spend,
      budget: c.budgetMicros ? c.budgetMicros / 1_000_000 : 0,
      clicks: agg.clicks,
      conversions: Math.round(agg.conversions),
      cpa,
      trend: trendPct === null ? "—" : `${trendPct >= 0 ? "+" : ""}${trendPct.toFixed(1).replace(".", ",")}%`,
    };
  });

  const clientsOut: ClientRow[] = clientRows.map((cl) => {
    const theirCampaigns = campaignsOut.filter((c) => c.client === cl.name);
    const spend = theirCampaigns.reduce((s, c) => s + c.spend, 0);
    return {
      name: cl.name,
      sector: cl.sector || "Secteur non renseigné",
      campaigns: theirCampaigns.length,
      spend: money(spend),
      status: cl.status,
      initials: cl.name.slice(0, 2).toUpperCase(),
      color: CLIENT_COLORS[cl.id % CLIENT_COLORS.length],
    };
  });

  const totalSpend = campaignsOut.reduce((s, c) => s + c.spend, 0);
  const totalConversions = campaignsOut.reduce((s, c) => s + c.conversions, 0);
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

  const dailySeries: { date: string; spend: number; conversions: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = byDate.get(key) ?? { spend: 0, conversions: 0 };
    dailySeries.push({ date: key, spend: entry.spend, conversions: entry.conversions });
  }

  const last15 = dailySeries.slice(-15);
  const previous15 = dailySeries.slice(-30, -15);
  const pctChange = (recent: number, previous: number) =>
    previous > 0 ? ((recent - previous) / previous) * 100 : null;

  const spendTrendPct = pctChange(
    last15.reduce((s, d) => s + d.spend, 0),
    previous15.reduce((s, d) => s + d.spend, 0)
  );
  const conversionsTrendPct = pctChange(
    last15.reduce((s, d) => s + d.conversions, 0),
    previous15.reduce((s, d) => s + d.conversions, 0)
  );

  const findings: Finding[] = evaluateAllCampaigns(
    campaignRows.map((c) => {
      const client = clientById.get(c.clientId);
      const win = byCampaign.get(c.id) ?? { total: emptyWindow(), last7: emptyWindow(), prev7: emptyWindow(), last14: emptyWindow() };
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        budgetMicros: c.budgetMicros,
        clientName: client?.name ?? "Client inconnu",
        clientSector: client?.sector ?? null,
        clientTargetCpa: client?.targetCpa ? Number(client.targetCpa) : null,
        last7: win.last7,
        prev7: win.prev7,
        last14: win.last14,
      };
    })
  );

  return {
    campaigns: campaignsOut,
    clients: clientsOut,
    dailySeries,
    findings,
    stats: {
      totalSpend,
      totalConversions,
      avgCpa,
      connectedClients: clientRows.filter((c) => c.status === "Connecté").length,
      totalClients: clientRows.length,
      spendTrendPct,
      conversionsTrendPct,
    },
  };
}
