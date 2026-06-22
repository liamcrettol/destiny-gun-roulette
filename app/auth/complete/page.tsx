import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  if (!code) redirect("/auth/error?error=missing_code");

  try {
    await signIn("credentials", { code, redirectTo: "/dashboard" });
  } catch (err) {
    // signIn throws a redirect — if it's not a redirect error, it's a real error
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("NEXT_REDIRECT")) {
      redirect("/auth/error?error=sign_in_failed");
    }
    throw err; // re-throw so Next.js handles the redirect
  }
}
