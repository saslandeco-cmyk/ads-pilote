import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { googleAdsConnections } from "@/lib/db/schema";
import { encryptSecret } from "@/lib/crypto";
import { sql } from "drizzle-orm";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || "v26";
const ACCESSIBLE_CUSTOMERS_URL = `https://googleads.googleapis.com/${API_VERSION}/customers:listAccessibleCustomers`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");
  const expectedState = request.cookies.get("google_oauth_state")?.value;

  if (oauthError) {
    return resultPage(false, `Google a renvoyé une erreur : ${oauthError}`);
  }

  if (!code || !state || state !== expectedState) {
    return resultPage(false, "État OAuth invalide ou code manquant (CSRF possible ou session expirée). Relancez la connexion.");
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_ADS_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return resultPage(false, "Variables GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET / GOOGLE_ADS_REDIRECT_URI manquantes dans .env.");
  }

  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    return resultPage(false, `Échec de l'échange du code contre un token : ${tokenData.error_description ?? tokenData.error ?? "erreur inconnue"}`);
  }

  const accessToken = tokenData.access_token as string;
  const refreshToken = tokenData.refresh_token as string | undefined;

  const customersResponse = await fetch(ACCESSIBLE_CUSTOMERS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const customersData = await customersResponse.json();

  if (!customersResponse.ok) {
    return resultPage(
      false,
      `Échange OAuth réussi, mais l'appel à l'API Google Ads a échoué : ${customersData.error?.message ?? "erreur inconnue"}. Vérifiez le niveau d'accès de votre projet Google Cloud.`
    );
  }

  const resourceNames: string[] = customersData.resourceNames ?? [];
  const customerIds = resourceNames.map((name) => name.replace("customers/", ""));

  if (!refreshToken) {
    return resultPage(
      false,
      "Google n'a renvoyé aucun refresh token (le compte avait déjà été autorisé précédemment). Révoquez l'accès sur myaccount.google.com/permissions puis recommencez.",
      customerIds
    );
  }

  const userinfoResponse = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const userinfo = await userinfoResponse.json();
  const googleEmail = userinfo.email as string | undefined;

  if (!googleEmail) {
    return resultPage(false, "Impossible de récupérer l'email du compte Google connecté.", customerIds);
  }

  await db
    .insert(googleAdsConnections)
    .values({
      googleEmail,
      refreshTokenEncrypted: encryptSecret(refreshToken),
    })
    .onConflictDoUpdate({
      target: googleAdsConnections.googleEmail,
      set: {
        refreshTokenEncrypted: encryptSecret(refreshToken),
        connectedAt: sql`now()`,
      },
    });

  const response = resultPage(
    true,
    `Connexion Google Ads réussie. Refresh token chiffré et enregistré en base pour ${googleEmail}.`,
    customerIds
  );
  response.cookies.delete("google_oauth_state");
  return response;
}

function resultPage(success: boolean, message: string, customerIds: string[] = []) {
  const list = customerIds.length
    ? `<p>Comptes clients accessibles :</p><ul>${customerIds.map((id) => `<li>${id}</li>`).join("")}</ul>`
    : "";

  const html = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><title>Connexion Google Ads</title></head>
<body style="font-family: system-ui, sans-serif; padding: 2rem; max-width: 560px; margin: 0 auto;">
  <h1 style="color: ${success ? "#16a34a" : "#dc2626"};">${success ? "Connexion réussie" : "Connexion échouée"}</h1>
  <p>${message}</p>
  ${list}
  <p><a href="/">Retour au dashboard</a></p>
</body>
</html>`;

  return new NextResponse(html, {
    status: success ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
