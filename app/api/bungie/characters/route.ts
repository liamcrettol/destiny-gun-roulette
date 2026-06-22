import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { getBungieToken } from "@/lib/auth/helpers";
import { getCharacters } from "@/lib/bungie/inventory";

export async function GET() {
  try {
    const session = await requireSession();
    const token = await getBungieToken(session.userId);
    const characters = await getCharacters(
      session.bungieMembershipType,
      session.bungieMembershipId,
      token
    );
    return NextResponse.json({ characters });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
