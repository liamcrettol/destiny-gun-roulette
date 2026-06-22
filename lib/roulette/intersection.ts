import type { ResolvedWeapon } from "@/types/weapon";
import type { WeaponSlot } from "@/types/bungie";

export function computeWeaponIntersection(
  memberWeapons: Map<string, ResolvedWeapon[]>
): Record<WeaponSlot, number[]> {
  const result: Record<WeaponSlot, number[]> = { kinetic: [], energy: [], power: [] };
  if (memberWeapons.size === 0) return result;

  const slots: WeaponSlot[] = ["kinetic", "energy", "power"];
  for (const slot of slots) {
    const memberHashSets: Set<number>[] = [];
    for (const weapons of Array.from(memberWeapons.values())) {
      const hashes = new Set<number>(
        (weapons as ResolvedWeapon[]).filter((w) => w.slot === slot).map((w) => w.itemHash)
      );
      memberHashSets.push(hashes);
    }
    if (memberHashSets.length === 0) continue;
    const [first, ...rest] = memberHashSets;
    result[slot] = Array.from(first).filter((hash) => rest.every((set) => set.has(hash)));
  }
  return result;
}

export function findBestInstance(
  itemHash: number,
  userWeapons: ResolvedWeapon[]
): ResolvedWeapon | null {
  const candidates = userWeapons.filter((w) => w.itemHash === itemHash);
  if (candidates.length === 0) return null;
  return (
    candidates.find((w) => w.isEquipped) ??
    candidates.find((w) => w.location === "character") ??
    candidates[0]
  );
}

// Archetype pairing rules.
// Key = weapon type of one primary slot.
// Value = allowed weapon types for the OTHER primary slot.
// Falls back to unrestricted if none of the allowed types exist in the pool.
const ARCHETYPE_RULES: Record<string, string[]> = {
  "Pulse Rifle": ["Shotgun"],
  "Hand Cannon": ["Shotgun", "Sniper Rifle"],
};

type WeaponDetail = { weaponType: string; tierType?: number };

function applyPairingRule(
  pool: number[],
  pairedType: string,
  details: Record<string, WeaponDetail>
): number[] {
  const allowed = ARCHETYPE_RULES[pairedType];
  if (!allowed) return pool;
  const filtered = pool.filter((h) => allowed.includes(details[h.toString()]?.weaponType ?? ""));
  // Fall back to full pool if no matching weapons exist (don't leave slot empty)
  return filtered.length > 0 ? filtered : pool;
}

function pick(pool: number[]): number | null {
  return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
}

/**
 * Roll a loadout from the shared pool, applying archetype pairing rules
 * between kinetic and energy slots.
 *
 * Rules (symmetric — applies whichever slot has the constrained type):
 *   Pulse Rifle  → paired slot must be a Shotgun
 *   Hand Cannon  → paired slot must be a Shotgun or Sniper Rifle (random)
 */
export function rollLoadout(
  intersection: Record<WeaponSlot, number[]>,
  weaponDetails: Record<string, WeaponDetail>,
  exclude?: Partial<Record<WeaponSlot, number>>
): Record<WeaponSlot, number | null> {
  const kineticKept = exclude?.kinetic !== undefined;
  const energyKept = exclude?.energy !== undefined;

  let kineticHash: number | null = exclude?.kinetic ?? null;
  let energyHash: number | null = exclude?.energy ?? null;

  // Roll kinetic first (if not locked)
  if (!kineticKept) {
    // If energy is already locked, let its type constrain the kinetic pool
    const energyType = energyHash !== null ? weaponDetails[energyHash.toString()]?.weaponType : null;
    const kPool = energyType
      ? applyPairingRule(intersection.kinetic, energyType, weaponDetails)
      : intersection.kinetic;
    kineticHash = pick(kPool);
  }

  // Roll energy (if not locked), constrained by whatever kinetic ended up as
  if (!energyKept) {
    const kineticType = kineticHash !== null ? weaponDetails[kineticHash.toString()]?.weaponType : null;
    const ePool = kineticType
      ? applyPairingRule(intersection.energy, kineticType, weaponDetails)
      : intersection.energy;
    energyHash = pick(ePool);
  }

  // Power is always independent, and never exotic (tierType 6)
  let powerPool = intersection.power.filter(
    (h) => (weaponDetails[h.toString()]?.tierType ?? 5) !== 6
  );
  if (powerPool.length === 0) powerPool = intersection.power; // fallback if all exotics
  const powerHash = exclude?.power ?? pick(powerPool);

  return { kinetic: kineticHash, energy: energyHash, power: powerHash };
}
