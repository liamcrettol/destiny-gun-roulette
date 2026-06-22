import { NextResponse } from "next/server";

// Custom Bungie OAuth initiation — does NOT send scope param (Bungie rejects it).
// NextAuth's built-in OAuth provider always appends scope, so we handle this ourselves.
export async function GET() {
  const state = crypto.randomUUID();

  const authUrl = new URL("https://www.bungie.net/en/OAuth/Authorize");
  authUrl.searchParams.set("client_id", process.env.BUNGIE_CLIENT_ID!);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  // Do NOT add scope — Bungie pre-configures it and rejects any scope param

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("bungie_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
