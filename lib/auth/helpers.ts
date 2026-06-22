import { auth } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/auth/encrypt";

export async function requireSession() {
  const session = await auth();
  if (!session?.userId) {
    throw new Error("Unauthorized");
  }
  return session;
}

/** Retrieve a decrypted, valid Bungie access token. Refreshes automatically if expired. */
export async function getBungieToken(userId: string): Promise<string> {
  const { data, error } = await adminSupabase
    .from("bungie_accounts")
    .select("access_token_enc, refresh_token_enc, expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !data) throw new Error("No Bungie account found for user");

  // Refresh if expired (with 90s buffer)
  if (data.expires_at) {
    const expiresAt = new Date(data.expires_at).getTime();
    if (Date.now() > expiresAt - 90_000) {
      if (!data.refresh_token_enc) {
        throw new Error("Bungie token expired — please sign in again");
      }
      const refreshToken = await decryptToken(data.refresh_token_enc);
      return refreshBungieToken(userId, refreshToken);
    }
  }

  return decryptToken(data.access_token_enc);
}

async function refreshBungieToken(userId: string, refreshToken: string): Promise<string> {
  const res = await fetch("https://www.bungie.net/Platform/App/OAuth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-API-Key": process.env.BUNGIE_API_KEY!,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.BUNGIE_CLIENT_ID!,
      client_secret: process.env.BUNGIE_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bungie token refresh failed (${res.status}): ${body.slice(0, 100)} — please sign out and sign in again`);
  }

  const tokens = await res.json();
  const encryptedAccess = await encryptToken(tokens.access_token);
  const encryptedRefresh = tokens.refresh_token
    ? await encryptToken(tokens.refresh_token)
    : null;
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  await adminSupabase
    .from("bungie_accounts")
    .update({
      access_token_enc: encryptedAccess,
      ...(encryptedRefresh ? { refresh_token_enc: encryptedRefresh } : {}),
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return tokens.access_token;
}
