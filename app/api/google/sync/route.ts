import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { clients, campaigns, campaignMetrics } from "@/lib/db/schema";
import { getStoredRefreshToken, getAccessToken, listAccessibleCustomerIds, gaqlSearch } from "@/lib/google-ads";

const CHANNEL_LABELS: Record<string, string> = {
  SEARCH: "Search",
  DISPLAY: "Display",
  SHOPPING: "Shopping",
  VIDEO: "Vidéo",
  PERFORMANCE_MAX: "Performance Max",
  DISCOVERY: "Discovery",
  LOCAL: "Local",
  SMART: "Smart",
};

const STATUS_LABELS: Record<string, string> = {
  ENABLED: "Active",
  PAUSED: "En pause",
};

type CustomerInfo = { id: string; descriptiveName?: string; manager?: boolean; testAccount?: boolean };

async function fetchCustomerInfo(accessToken: string, customerId: string, loginCustomerId?: string) {
  const rows = await gaqlSearch(
    accessToken,
    customerId,
    `SELECT customer.id, customer.descriptive_name, customer.manager, customer.test_account FROM customer LIMIT 1`,
    loginCustomerId
  );
  return rows[0]?.customer as CustomerInfo | undefined;
}

export async function GET() {
  const log: string[] = [];

  try {
    const refreshToken = await getStoredRefreshToken();
    const accessToken = await getAccessToken(refreshToken);
    const customerIds = await listAccessibleCustomerIds(accessToken);

    const resolved = new Map<string, { customer: CustomerInfo; loginCustomerId?: string }>();
    const pending: string[] = [];
    const managerIds: string[] = [];

    for (const customerId of customerIds) {
      try {
        const customer = await fetchCustomerInfo(accessToken, customerId);
        if (customer) {
          resolved.set(customerId, { customer });
          if (customer.manager) managerIds.push(customerId);
        }
      } catch {
        pending.push(customerId);
      }
    }

    for (const customerId of pending) {
      let found = false;
      for (const managerId of managerIds) {
        try {
          const customer = await fetchCustomerInfo(accessToken, customerId, managerId);
          if (customer) {
            resolved.set(customerId, { customer, loginCustomerId: managerId });
            found = true;
            break;
          }
        } catch {
          // essaie le manager suivant
        }
      }
      if (!found) {
        log.push(`Compte ${customerId} ignoré (inaccessible, même via le(s) compte(s) manager détecté(s)).`);
      }
    }

    for (const [customerId, { customer, loginCustomerId }] of resolved) {
      if (customer.manager || customer.testAccount) {
        log.push(`Compte ${customerId} ignoré (manager ou compte de test).`);
        continue;
      }

      const name = customer.descriptiveName || `Compte ${customerId}`;

      const [client] = await db
        .insert(clients)
        .values({ name, googleCustomerId: customerId, status: "Connecté" })
        .onConflictDoUpdate({
          target: clients.googleCustomerId,
          set: { name, status: "Connecté" },
        })
        .returning();

      log.push(`Client "${name}" (${customerId}) synchronisé.`);

      const campaignRows = await gaqlSearch(
        accessToken,
        customerId,
        `SELECT campaign.id, campaign.name, campaign.advertising_channel_type, campaign.status,
                campaign_budget.amount_micros, segments.date,
                metrics.cost_micros, metrics.clicks, metrics.conversions
         FROM campaign
         WHERE segments.date DURING LAST_30_DAYS
           AND campaign.status != 'REMOVED'`,
        loginCustomerId
      );

      for (const row of campaignRows) {
        const campaignData = row.campaign as {
          id: string;
          name: string;
          advertisingChannelType?: string;
          status?: string;
        };
        const budget = row.campaignBudget as { amountMicros?: string } | undefined;
        const segments = row.segments as { date: string };
        const metrics = row.metrics as { costMicros?: string; clicks?: string; conversions?: number };

        const channel = CHANNEL_LABELS[campaignData.advertisingChannelType ?? ""] ?? campaignData.advertisingChannelType;
        const status = STATUS_LABELS[campaignData.status ?? ""] ?? campaignData.status ?? "Active";
        const budgetMicros = budget?.amountMicros ? Number(budget.amountMicros) : null;

        const [campaign] = await db
          .insert(campaigns)
          .values({ clientId: client.id, googleCampaignId: campaignData.id, name: campaignData.name, channel, status, budgetMicros })
          .onConflictDoUpdate({
            target: campaigns.googleCampaignId,
            set: { name: campaignData.name, channel, status, budgetMicros },
          })
          .returning();

        await db
          .insert(campaignMetrics)
          .values({
            campaignId: campaign.id,
            date: segments.date,
            costMicros: Number(metrics.costMicros ?? 0),
            clicks: Number(metrics.clicks ?? 0),
            conversions: String(metrics.conversions ?? 0),
          })
          .onConflictDoUpdate({
            target: [campaignMetrics.campaignId, campaignMetrics.date],
            set: {
              costMicros: Number(metrics.costMicros ?? 0),
              clicks: Number(metrics.clicks ?? 0),
              conversions: String(metrics.conversions ?? 0),
            },
          });
      }

      log.push(`→ ${campaignRows.length} lignes de métriques (30 derniers jours) pour "${name}".`);
    }

    return NextResponse.json({ success: true, log });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message, log }, { status: 500 });
  }
}
