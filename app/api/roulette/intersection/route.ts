import { NextRequest, NextResponse } from "next/server";
import { requireSession, getBungieToken } from "@/lib/auth/helpers";
import { adminSupabase } from "@/lib/supabase/admin";
import { getRawWeapons } from "@/lib/bungie/rawInventory";
import { getWeaponDefinitions, getPerkNames } from "@/lib/bungie/definitions";
import { getWeaponPerkHashes } from "@/lib/bungie/sockets";
import { getAcquiredCollectibles } from "@/lib/bungie/collectibles";
import { z } from "zod";
import type { WeaponSlot } from "@/types/bungie";
import { bucketToSlot } from "@/types/bungie";

const schema = z.object({
  lobbyId: z.string().uuid(),
  characterId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { lobbyId, characterId } = schema.parse(await req.json());

    const { data: members } = await adminSupabase
      .from("lobby_members")
      .select("user_id, bungie_membership_type, bungie_membership_id")
      .eq("lobby_id", lobbyId);

    if (!members?.length) {
      return NextResponse.json({ error: "No members found" }, { status: 404 });
    }

    const slots: WeaponSlot[] = ["kinetic", "energy", "power"];

    // ── Phase 1: fetch inventories + collectibles for all members in parallel ──

    const memberWeaponMap = new Map<string, Awaited<ReturnType<typeof getRawWeapons>>>();
    const memberCollectibleMap = new Map<string, Set<number>>(); // userId → acquired collectible hashes

    await Promise.all(members.map(async (member) => {
      try {
        const token = await getBungieToken(member.user_id);
        const [weapons, collectibles] = await Promise.all([
          getRawWeapons(member.bungie_membership_type, member.bungie_membership_id, token),
          getAcquiredCollectibles(member.bungie_membership_type, member.bungie_membership_id, token).catch(() => new Set<number>()),
        ]);
        memberWeaponMap.set(member.user_id, weapons);
        memberCollectibleMap.set(member.user_id, collectibles);
      } catch (e) {
        console.warn(`Skipping member ${member.user_id}:`, e instanceof Error ? e.message : e);
      }
    }));

    if (memberWeaponMap.size === 0) {
      return NextResponse.json({ error: "Could not load any member inventories" }, { status: 500 });
    }

    // ── Phase 2: per-member inventory hash sets (per slot) ─────────────────────

    const memberSlotSets = new Map<string, Record<WeaponSlot, Set<number>>>();
    for (const [userId, weapons] of memberWeaponMap) {
      const sets: Record<WeaponSlot, Set<number>> = { kinetic: new Set(), energy: new Set(), power: new Set() };
      for (const w of weapons) sets[w.slot].add(w.itemHash);
      memberSlotSets.set(userId, sets);
    }

    // ── Phase 3: inventory intersection ────────────────────────────────────────

    const intersection: Record<WeaponSlot, Set<number>> = { kinetic: new Set(), energy: new Set(), power: new Set() };
    for (const slot of slots) {
      const memberSets = [...memberSlotSets.values()].map((s) => s[slot]);
      if (memberSets.length === 0) continue;
      const [first, ...rest] = memberSets;
      for (const hash of first) {
        if (rest.every((s) => s.has(hash))) intersection[slot].add(hash);
      }
    }

    // ── Phase 4: exotic collection expansion ───────────────────────────────────
    // Candidates: exotic weapons in someone's inventory but NOT already in the
    // inventory intersection (no duplicate entries).

    const unionHashes = new Set<number>();
    for (const sets of memberSlotSets.values()) {
      for (const slot of slots) sets[slot].forEach((h) => unionHashes.add(h));
    }
    // Exclude hashes already in intersection — those need no collection check
    for (const slot of slots) intersection[slot].forEach((h) => unionHashes.delete(h));

    // Look up definitions for candidates (to find exotics with collectibleHash + slot)
    const candidateDefMap = unionHashes.size > 0 ? await getWeaponDefinitions([...unionHashes]) : new Map();

    const collectionHashSet = new Set<number>(); // hashes added via collections

    for (const [hash, def] of candidateDefMap) {
      if (def.tierType !== 6) continue;         // only exotics
      if (!def.collectibleHash) continue;        // must be in collections
      const slot = bucketToSlot(def.defaultBucketHash);
      if (!slot) continue;

      // All members must have it: either in their inventory or in their collections
      let allHaveIt = true;
      for (const [userId, sets] of memberSlotSets) {
        if (sets[slot].has(hash)) continue;      // has it in inventory ✓
        const acquired = memberCollectibleMap.get(userId);
        if (!acquired?.has(def.collectibleHash)) { allHaveIt = false; break; }
      }

      if (allHaveIt) {
        intersection[slot].add(hash);
        collectionHashSet.add(hash);
      }
    }

    // ── Phase 5: look up definitions for final intersection ────────────────────

    const allIntersectionHashes = [...new Set([
      ...intersection.kinetic,
      ...intersection.energy,
      ...intersection.power,
    ])];

    // Merge candidate defs (already fetched) with a fresh batch for inventory hashes
    const inventoryOnlyHashes = allIntersectionHashes.filter((h) => !candidateDefMap.has(h));
    const inventoryDefMap = inventoryOnlyHashes.length > 0
      ? await getWeaponDefinitions(inventoryOnlyHashes)
      : new Map();

    const defMap = new Map([...inventoryDefMap, ...candidateDefMap]);

    const weaponDetails: Record<string, {
      name: string; icon: string; weaponType: string; damageType: string;
      tierType: number; tierName: string; ammoType: string; stats: Record<string, number>;
    }> = {};
    for (const [hash, def] of defMap.entries()) {
      if (!allIntersectionHashes.includes(hash)) continue; // only intersection weapons
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

    // Convert sets to arrays for response
    const intersectionArrays: Record<WeaponSlot, number[]> = {
      kinetic: [...intersection.kinetic],
      energy: [...intersection.energy],
      power: [...intersection.power],
    };

    // ── Phase 6: equipped hashes for seeding the roll ──────────────────────────

    const myWeapons = memberWeaponMap.get(session.userId) ?? [];
    const equippedHashes: Record<WeaponSlot, number | null> = { kinetic: null, energy: null, power: null };
    for (const slot of slots) {
      const equipped =
        myWeapons.find((w) => w.slot === slot && w.isEquipped && (!characterId || w.characterId === characterId)) ??
        myWeapons.find((w) => w.slot === slot && w.isEquipped);
      if (equipped) equippedHashes[slot] = equipped.itemHash;
    }

    // ── Phase 7: per-instance perk rolls for the captain ──────────────────────

    const allIntersectionHashSet = new Set(allIntersectionHashes);
    const myIntersectionWeapons = myWeapons.filter((w) => allIntersectionHashSet.has(w.itemHash));
    const myInstanceIds = new Set(myIntersectionWeapons.map((w) => w.itemInstanceId));

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
            instancePerks[key].push({ instanceId: weapon.itemInstanceId, perks, location: weapon.location, characterId: weapon.characterId });
          }
        }
      } catch (e) {
        console.warn("Failed to fetch perk rolls:", e instanceof Error ? e.message : e);
      }
    }

    return NextResponse.json({
      intersection: intersectionArrays,
      weaponDetails,
      memberCount: memberWeaponMap.size,
      equippedHashes,
      instancePerks,
      collectionHashes: [...collectionHashSet], // exotic weapons added from collections
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
