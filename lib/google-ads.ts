import { db } from "@/lib/db/client";
import { googleAdsConnections } from "@/lib/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { desc } from "drizzle-orm";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || "v26";

export async function getStoredRefreshToken() {
  const [connection] = await db
    .select()
    .from(googleAdsConnections)
    .orderBy(desc(googleAdsConnections.connectedAt))
    .limit(1);

  if (!connection) {
    throw new Error("Aucune connexion Google Ads enregistrée. Lancez /api/google/connect d'abord.");
  }

  return decryptSecret(connection.refreshTokenEncrypted);
}

export async function getAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET manquants");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Échec du rafraîchissement du token : ${data.error_description ?? data.error}`);
  }

  return data.access_token as string;
}

export async function listAccessibleCustomerIds(accessToken: string) {
  const response = await fetch(`https://googleads.googleapis.com/${API_VERSION}/customers:listAccessibleCustomers`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Échec de listAccessibleCustomers : ${data.error?.message ?? "erreur inconnue"}`);
  }

  const resourceNames: string[] = data.resourceNames ?? [];
  return resourceNames.map((name) => name.replace("customers/", ""));
}

export async function gaqlSearch(
  accessToken: string,
  customerId: string,
  query: string,
  loginCustomerId?: string
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId;
  }

  const results: Record<string, unknown>[] = [];
  let pageToken: string | undefined;

  do {
    const response = await fetch(
      `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/googleAds:search`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ query, pageToken }),
      }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message ?? `Échec de la requête GAQL sur le compte ${customerId}`);
    }

    results.push(...(data.results ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return results;
}
