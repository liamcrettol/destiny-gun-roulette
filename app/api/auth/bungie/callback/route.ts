import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/auth/encrypt";

const BASE_URL = process.env.NEXTAUTH_URL!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${BASE_URL}/auth/error?error=${encodeURIComponent(error)}`);
  }

  // Validate CSRF state
  const savedState = req.cookies.get("bungie_oauth_state")?.value;
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${BASE_URL}/auth/error?error=state_mismatch`);
  }
  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/auth/error?error=no_code`);
  }

  // Exchange auth code for tokens
  const tokenRes = await fetch("https://www.bungie.net/Platform/App/OAuth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-API-Key": process.env.BUNGIE_API_KEY!,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.BUNGIE_CLIENT_ID!,
      client_secret: process.env.BUNGIE_CLIENT_SECRET!,
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error("Token exchange failed:", errBody);
    return NextResponse.redirect(`${BASE_URL}/auth/error?error=token_exchange_failed`);
  }

  const tokens = await tokenRes.json();
  // { access_token, token_type, expires_in, refresh_token, refresh_expires_in, membership_id }

  // Fetch Bungie user profile
  const userRes = await fetch("https://www.bungie.net/Platform/User/GetCurrentBungieNetUser/", {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "X-API-Key": process.env.BUNGIE_API_KEY!,
    },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(`${BASE_URL}/auth/error?error=user_fetch_failed`);
  }

  const userData = await userRes.json();
  const profile = userData.Response;
  const primaryMembership = profile.destinyMemberships?.[0];

  const userId: string = profile.membershipId;
  const displayName: string = profile.uniqueName ?? profile.displayName ?? "Guardian";
  const membershipId: string = primaryMembership?.membershipId ?? userId;
  const membershipType: number = primaryMembership?.membershipType ?? 0;

  // Encrypt tokens before storing
  const encryptedAccess = await encryptToken(tokens.access_token);
  const encryptedRefresh = tokens.refresh_token
    ? await encryptToken(tokens.refresh_token)
    : null;
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  // Persist user + account
  await adminSupabase
    .from("users")
    .upsert({ id: userId, display_name: displayName, updated_at: new Date().toISOString() }, { onConflict: "id" });

  await adminSupabase.from("bungie_accounts").upsert(
    {
      user_id: userId,
      membership_id: membershipId,
      membership_type: membershipType,
      access_token_enc: encryptedAccess,
      refresh_token_enc: encryptedRefresh,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  // Create a one-time auth code so the complete page can sign in via credentials
  const authCode = crypto.randomUUID();
  await adminSupabase.from("auth_codes").insert({
    code: authCode,
    user_id: userId,
    expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 min
  });

  const response = NextResponse.redirect(`${BASE_URL}/auth/complete?code=${authCode}`);
  // Clear the state cookie
  response.cookies.set("bungie_oauth_state", "", { maxAge: 0, path: "/" });
  return response;
}
