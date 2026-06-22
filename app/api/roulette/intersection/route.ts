import { NextRequest, NextResponse } from "next/server";
import { requireSession, getBungieToken } from "@/lib/auth/helpers";
import { adminSupabase } from "@/lib/supabase/admin";
import { getRawWeapons } from "@/lib/bungie/rawInventory";
import { getWeaponDefinitions, getPerkNames } from "@/lib/bungie/definitions";
import { getWeaponPerkHashes } from "@/lib/bungie/sockets";
import { z } from "zod";
import type { WeaponSlot } from "@/types/bungie";

const schema = z.object({
  lobbyId: z.string().uuid(),
  characterId: z.string().optional(), // filter equippedHashes to this character
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { lobbyId, characterId } = schema.parse(await req.json());

    // Get all members
    const { data: members } = await adminSupabase
      .from("lobby_members")
      .select("user_id, bungie_membership_type, bungie_membership_id")
      .eq("lobby_id", lobbyId);

    if (!members?.length) {
      return NextResponse.json({ error: "No members found" }, { status: 404 });
    }

    // Fetch raw weapons for each member (no manifest needed)
    const memberWeaponMap = new Map<string, Awaited<ReturnType<typeof getRawWeapons>>>();

    const memberErrors: string[] = [];
    for (const member of members) {
      try {
        const token = await getBungieToken(member.user_id);
        const weapons = await getRawWeapons(
          member.bungie_membership_type,
          member.bungie_membership_id,
          token
        );
        memberWeaponMap.set(member.user_id, weapons);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`Skipping member ${member.user_id}:`, msg);
        memberErrors.push(msg);
      }
    }

    if (memberWeaponMap.size === 0) {
      const reason = memberErrors[0] ?? "Could not load any member inventories";
      return NextResponse.json({ error: reason }, { status: 500 });
    }

    // Compute intersection per slot
    // Solo: use own weapons as the pool (intersection of 1 = all)
    const slots: WeaponSlot[] = ["kinetic", "energy", "power"];
    const intersection: Record<WeaponSlot, number[]> = { kinetic: [], energy: [], power: [] };

    for (const slot of slots) {
      const memberHashSets: Set<number>[] = [];
      for (const weapons of Array.from(memberWeaponMap.values())) {
        const hashes = new Set<number>(weapons.filter((w) => w.slot === slot).map((w) => w.itemHash));
        memberHashSets.push(hashes);
      }
      if (memberHashSets.length === 0) continue;
      const [first, ...rest] = memberHashSets;
      intersection[slot] = Array.from(first).filter((h) => rest.every((s) => s.has(h)));
    }

    // Look up definitions only for the intersected hashes (fast — 3 parallel calls max per slot)
    const allHashes = [...new Set([
      ...intersection.kinetic,
      ...intersection.energy,
      ...intersection.power,
    ])];

    const defMap = await getWeaponDefinitions(allHashes);

    const weaponDetails: Record<string, {
      name: string; icon: string; weaponType: string; damageType: string;
      tierType: number; tierName: string; ammoType: string; stats: Record<string, number>;
    }> = {};
    for (const [hash, def] of defMap.entries()) {
      weaponDetails[hash.toString()] = {
        name: def.name,
        icon: def.icon,
        weaponType: def.weaponType,
        damageType: def.damageType,
        tierType: def.tierType,
        tierName: def.tierName,
        ammoType: def.ammoType,
        stats: def.stats,
      };
    }

    // Return the requesting user's currently equipped weapon per slot
    // so the client can seed the initial roll with their current loadout.
    const myWeapons = memberWeaponMap.get(session.userId) ?? [];
    const equippedHashes: Record<WeaponSlot, number | null> = {
      kinetic: null,
      energy: null,
      power: null,
    };
    for (const slot of slots) {
      // Prefer the selected character's equipped weapon; fall back to any equipped
      const equipped =
        myWeapons.find((w) => w.slot === slot && w.isEquipped && (!characterId || w.characterId === characterId)) ??
        myWeapons.find((w) => w.slot === slot && w.isEquipped);
      if (equipped) {
        // Include even if not in intersection — will be used as seed; roll filters to pool
        equippedHashes[slot] = equipped.itemHash;
      }
    }

    // Fetch per-instance perk rolls for the requesting user's copies of intersection weapons.
    // Only for weapons actually in the shared pool (not the full inventory).
    const allIntersectionHashes = new Set([
      ...intersection.kinetic,
      ...intersection.energy,
      ...intersection.power,
    ]);
    const myIntersectionWeapons = myWeapons.filter((w) => allIntersectionHashes.has(w.itemHash));
    const myInstanceIds = new Set(myIntersectionWeapons.map((w) => w.itemInstanceId));

    // instancePerks: itemHash → array of instances with named perks
    const instancePerks: Record<string, Array<{
      instanceId: string; perks: string[]; location: string; characterId?: string;
    }>> = {};

    if (myInstanceIds.size > 0) {
      try {
        const myMember = members.find((m) => m.user_id === session.userId);
        if (myMember) {
          const myToken = await getBungieToken(session.userId);
          const perkHashMap = await getWeaponPerkHashes(
            myMember.bungie_membership_type,
            myMember.bungie_membership_id,
            myToken,
            myInstanceIds
          );

          const allPerkHashes = [...new Set([...perkHashMap.values()].flat())];
          const perkNameMap = await getPerkNames(allPerkHashes);

          for (const weapon of myIntersectionWeapons) {
            const hashes = perkHashMap.get(weapon.itemInstanceId);
            if (!hashes) continue;
            const perks = hashes.map((h) => perkNameMap.get(h)).filter(Boolean) as string[];
            if (perks.length === 0) continue;
            const key = weapon.itemHash.toString();
            if (!instancePerks[key]) instancePerks[key] = [];
            instancePerks[key].push({
              instanceId: weapon.itemInstanceId,
              perks,
              location: weapon.location,
              characterId: weapon.characterId,
            });
          }
        }
      } catch (e) {
        // Non-fatal: weapon browser still works, just without perk data
        console.warn("Failed to fetch perk rolls:", e instanceof Error ? e.message : e);
      }
    }

    return NextResponse.json({
      intersection,
      weaponDetails,
      memberCount: memberWeaponMap.size,
      equippedHashes,
      instancePerks,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
