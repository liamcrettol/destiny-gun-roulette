import { NextRequest, NextResponse } from "next/server";
import { requireSession, getBungieToken } from "@/lib/auth/helpers";
import { adminSupabase } from "@/lib/supabase/admin";
import { getWeapons } from "@/lib/bungie/inventory";
import { ensureManifest } from "@/lib/manifest/lookup";
import { findBestInstance } from "@/lib/roulette/intersection";
import { applyWeapons } from "@/lib/bungie/equip";
import type { WeaponToApply } from "@/lib/bungie/equip";
import { z } from "zod";

const schema = z.object({
  lobbyId: z.string().uuid(),
  roundId: z.string().uuid(),
  characterId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());

    // Get the locked slots for this round
    const { data: slots } = await adminSupabase
      .from("lobby_loadout_slots")
      .select("*")
      .eq("round_id", body.roundId);

    if (!slots?.length) {
      return NextResponse.json({ error: "No loadout rolled yet" }, { status: 400 });
    }

    // Get this user's weapons to find their instance of each shared hash
    await ensureManifest();
    const token = await getBungieToken(session.userId);
    const myWeapons = await getWeapons(
      session.bungieMembershipType,
      session.bungieMembershipId,
      token
    );

    // Build the weapons-to-apply list
    const weaponsToApply: WeaponToApply[] = [];

    for (const slot of slots) {
      const best = findBestInstance(slot.item_hash, myWeapons);
      if (!best) continue; // User doesn't own this weapon — will show as failed

      weaponsToApply.push({
        itemHash: best.itemHash,
        itemInstanceId: best.itemInstanceId,
        slot: slot.slot as "kinetic" | "energy" | "power",
        location: best.location,
        characterId: best.characterId,
      });
    }

    const results = await applyWeapons(
      weaponsToApply,
      body.characterId,
      session.bungieMembershipType,
      token,
      session.userId,
      session.displayName
    );

    // Persist results to roll_history
    await adminSupabase.from("roll_history").upsert(
      {
        lobby_id: body.lobbyId,
        round_id: body.roundId,
        round_number: 0, // caller can supply actual round
        applied_at: new Date().toISOString(),
        apply_results: results,
      },
      { onConflict: "round_id" }
    );

    return NextResponse.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
