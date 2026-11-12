import { pgTable, serial, text, integer, bigint, numeric, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sector: text("sector"),
  googleCustomerId: text("google_customer_id").unique(),
  status: text("status").notNull().default("À reconnecter"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const googleAdsConnections = pgTable("google_ads_connections", {
  id: serial("id").primaryKey(),
  googleEmail: text("google_email").notNull().unique(),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
  loginCustomerId: text("login_customer_id"),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  googleCampaignId: text("google_campaign_id").notNull(),
  name: text("name").notNull(),
  channel: text("channel"),
}, (table) => ({
  uniqueGoogleCampaign: uniqueIndex("campaigns_google_campaign_id_idx").on(table.googleCampaignId),
}));

export const campaignMetrics = pgTable("campaign_metrics", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  date: date("date").notNull(),
  costMicros: bigint("cost_micros", { mode: "number" }).notNull(),
  clicks: integer("clicks").notNull(),
  conversions: numeric("conversions").notNull(),
}, (table) => ({
  uniqueCampaignDate: uniqueIndex("campaign_metrics_campaign_date_idx").on(table.campaignId, table.date),
}));
