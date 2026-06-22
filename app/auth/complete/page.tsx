import { redirect } from "next/navigation";
import { completeSignIn } from "./actions";

export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  if (!code) redirect("/auth/error?error=missing_code");

  try {
    await completeSignIn(code);
  } catch (err) {
    // Next.js 15 redirect errors use err.digest, not err.message
    const digest = (err as { digest?: string }).digest ?? "";
    const message = err instanceof Error ? err.message : String(err);
    if (digest.startsWith("NEXT_REDIRECT") || message.includes("NEXT_REDIRECT")) {
      throw err; // let Next.js handle the redirect
    }
    console.error("completeSignIn error:", err);
    redirect("/auth/error?error=sign_in_failed");
  }
}
