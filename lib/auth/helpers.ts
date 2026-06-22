import { auth } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/auth/encrypt";

export async function requireSession() {
  const session = await auth();
  if (!session?.userId) {
    throw new Error("Unauthorized");
  }
  return session;
}

/** Retrieve a decrypted Bungie access token for a given userId. */
export async function getBungieToken(userId: string): Promise<string> {
  const { data, error } = await adminSupabase
    .from("bungie_accounts")
    .select("access_token_enc, expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !data) throw new Error("No Bungie account found");

  // TODO: add refresh token logic when expires_at is past
  return decryptToken(data.access_token_enc);
}
