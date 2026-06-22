import { NextResponse } from "next/server";
import { requireSession, getBungieToken } from "@/lib/auth/helpers";
import { getWeapons } from "@/lib/bungie/inventory";
import { ensureManifest } from "@/lib/manifest/lookup";

export async function GET() {
  try {
    const session = await requireSession();
    const token = await getBungieToken(session.userId);

    // Pre-load manifest so lookupWeapon (sync) works
    await ensureManifest();

    const weapons = await getWeapons(
      session.bungieMembershipType,
      session.bungieMembershipId,
      token
    );

    return NextResponse.json({ weapons });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
