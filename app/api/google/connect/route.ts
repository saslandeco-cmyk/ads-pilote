import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = "https://www.googleapis.com/auth/adwords openid email";

export async function GET() {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_ADS_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "GOOGLE_ADS_CLIENT_ID ou GOOGLE_ADS_REDIRECT_URI manquant dans .env" },
      { status: 500 }
    );
  }

  const state = randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const response = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
