import { NextRequest, NextResponse } from "next/server";
import { requireSession, getBungieToken } from "@/lib/auth/helpers";
import { adminSupabase } from "@/lib/supabase/admin";
import { getRawWeapons, type RawWeapon } from "@/lib/bungie/rawInventory";
import { applyWeapons } from "@/lib/bungie/equip";
import type { WeaponToApply } from "@/lib/bungie/equip";
import { z } from "zod";

const schema = z.object({
  lobbyId: z.string().uuid(),
  roundId: z.string().uuid(),
  characterId: z.string(),
});

function findBestInstance(itemHash: number, weapons: RawWeapon[]): RawWeapon | null {
  const candidates = weapons
    .filter((w) => w.itemHash === itemHash)
    .sort((a, b) => b.lightLevel - a.lightLevel); // highest light level first
  if (candidates.length === 0) return null;
  return (
    candidates.find((w) => w.isEquipped) ??
    candidates.find((w) => w.location === "character") ??
    candidates[0]
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());

    const { data: slots } = await adminSupabase
      .from("lobby_loadout_slots")
      .select("*")
      .eq("round_id", body.roundId);

    if (!slots?.length) {
      return NextResponse.json({ error: "No loadout rolled yet" }, { status: 400 });
    }

    const token = await getBungieToken(session.userId);
    const myWeapons = await getRawWeapons(
      session.bungieMembershipType,
      session.bungieMembershipId,
      token
    );

    const weaponsToApply: WeaponToApply[] = [];
    for (const slot of slots) {
      const best = findBestInstance(slot.item_hash, myWeapons);
      if (!best) continue;
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

    await adminSupabase.from("roll_history").upsert(
      {
        lobby_id: body.lobbyId,
        round_id: body.roundId,
        round_number: 0,
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
