"use server";

import { signIn } from "@/lib/auth";

export async function completeSignIn(code: string) {
  await signIn("credentials", { code, redirectTo: "/dashboard" });
}
