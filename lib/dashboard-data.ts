import { db } from "@/lib/db/client";
import { clients, campaigns, campaignMetrics } from "@/lib/db/schema";

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

const CLIENT_COLORS = ["blue", "violet", "orange", "green"];

function money(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
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

  const byCampaign = new Map<number, { spend: number; clicks: number; conversions: number; recentSpend: number; previousSpend: number }>();
  const byDate = new Map<string, { spend: number; conversions: number }>();

  for (const m of metricRows) {
    const cost = m.costMicros / 1_000_000;
    const conversions = Number(m.conversions);

    const entry = byCampaign.get(m.campaignId) ?? { spend: 0, clicks: 0, conversions: 0, recentSpend: 0, previousSpend: 0 };
    entry.spend += cost;
    entry.clicks += m.clicks;
    entry.conversions += conversions;
    const d = new Date(m.date);
    if (d >= sevenDaysAgo) entry.recentSpend += cost;
    else if (d >= fourteenDaysAgo) entry.previousSpend += cost;
    byCampaign.set(m.campaignId, entry);

    const dayEntry = byDate.get(m.date) ?? { spend: 0, conversions: 0 };
    dayEntry.spend += cost;
    dayEntry.conversions += conversions;
    byDate.set(m.date, dayEntry);
  }

  const clientById = new Map(clientRows.map((c) => [c.id, c]));

  const campaignsOut: CampaignRow[] = campaignRows.map((c) => {
    const agg = byCampaign.get(c.id) ?? { spend: 0, clicks: 0, conversions: 0, recentSpend: 0, previousSpend: 0 };
    const client = clientById.get(c.clientId);
    const cpa = agg.conversions > 0 ? agg.spend / agg.conversions : 0;
    const trendPct = agg.previousSpend > 0 ? ((agg.recentSpend - agg.previousSpend) / agg.previousSpend) * 100 : null;

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
      sector: "Compte Google Ads",
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

  return {
    campaigns: campaignsOut,
    clients: clientsOut,
    dailySeries,
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
