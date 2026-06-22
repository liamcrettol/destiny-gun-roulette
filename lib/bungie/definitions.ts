// Look up individual item definitions from the Bungie API.
// Much faster than downloading the full manifest in a serverless environment.

const BUNGIE_ROOT = "https://www.bungie.net/Platform";
const BUNGIE_CDN = "https://www.bungie.net";

export interface WeaponDefinition {
  itemHash: number;
  name: string;
  icon: string;
  weaponType: string;
  ammoType: string;
  damageType: string;
  tierName: string;
  tierType: number;
  flavorText: string;
  defaultBucketHash: number;
  collectibleHash?: number; // present if this item appears in Collections
  stats: Record<string, number>; // stat label → value (0-100 range for most)
  intrinsicPerk: string | null;  // archetype/frame name
}

const AMMO_TYPE_NAMES: Record<number, string> = { 1: "Primary", 2: "Special", 3: "Heavy" };

const WEAPON_STAT_HASHES: Record<number, string> = {
  4284893193: "RPM",
  4043523819: "Impact",
  1240592695: "Range",
  155624089: "Stability",
  943549884: "Handling",
  4188031367: "Reload",
  1345609583: "Aim Assist",
  3871231066: "Magazine",
  2961396640: "Charge Time",
  1931675084: "Inventory",
  3555269338: "Zoom",
};
const TIER_NAMES: Record<number, string> = { 6: "Exotic", 5: "Legendary", 4: "Rare" };
const DAMAGE_TYPE_NAMES: Record<number, string> = {
  3373582085: "Kinetic",
  1847026933: "Solar",
  2303181850: "Arc",
  3454344768: "Void",
  151347233: "Stasis",
  3949783978: "Strand",
};

// In-memory cache per serverless invocation
const defCache = new Map<number, WeaponDefinition>();

export async function getWeaponDefinition(
  itemHash: number
): Promise<WeaponDefinition | null> {
  if (defCache.has(itemHash)) return defCache.get(itemHash)!;

  try {
    const res = await fetch(
      `${BUNGIE_ROOT}/Destiny2/Manifest/DestinyInventoryItemDefinition/${itemHash}/`,
      {
        headers: { "X-API-Key": process.env.BUNGIE_API_KEY! },
        next: { revalidate: 86400 }, // cache 24h at edge
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const def = data.Response;
    if (!def || def.itemType !== 3) return null; // not a weapon

    // Parse weapon stats
    const stats: Record<string, number> = {};
    for (const [hashStr, statData] of Object.entries(def.stats?.stats ?? {})) {
      const label = WEAPON_STAT_HASHES[Number(hashStr)];
      if (label) stats[label] = (statData as { value: number }).value;
    }

    // Intrinsic frame/archetype — first socket's initial plug display name
    let intrinsicPerk: string | null = null;
    const firstSocket = def.sockets?.socketEntries?.[0];
    if (firstSocket?.singleInitialItemHash) {
      intrinsicPerk = null; // resolved lazily via separate lookup if needed
    }
    // Try to get frame name from itemTypeAndTierDisplayName or intrinsic category
    if (def.itemSubType) {
      // itemTypeDisplayName often contains frame info like "Aggressive Frame Hand Cannon"
      intrinsicPerk = def.itemTypeDisplayName ?? null;
    }

    const result: WeaponDefinition = {
      itemHash,
      name: def.displayProperties?.name ?? "Unknown",
      icon: def.displayProperties?.icon ? `${BUNGIE_CDN}${def.displayProperties.icon}` : "",
      weaponType: def.itemTypeDisplayName ?? "Weapon",
      ammoType: AMMO_TYPE_NAMES[def.equippingBlock?.ammoType ?? 1] ?? "Primary",
      damageType: DAMAGE_TYPE_NAMES[def.defaultDamageTypeHash ?? 0] ?? "Kinetic",
      tierName: TIER_NAMES[def.inventory?.tierType ?? 5] ?? "Legendary",
      tierType: def.inventory?.tierType ?? 5,
      flavorText: def.flavorText ?? "",
      defaultBucketHash: def.inventory?.bucketTypeHash ?? 0,
      collectibleHash: def.collectibleHash ?? undefined,
      stats,
      intrinsicPerk,
    };
    defCache.set(itemHash, result);
    return result;
  } catch {
    return null;
  }
}

// ── Perk name lookup (works for any DestinyInventoryItemDefinition) ───────────

const perkNameCache = new Map<number, string | null>();

export async function getPerkName(hash: number): Promise<string | null> {
  if (perkNameCache.has(hash)) return perkNameCache.get(hash)!;
  try {
    const res = await fetch(
      `${BUNGIE_ROOT}/Destiny2/Manifest/DestinyInventoryItemDefinition/${hash}/`,
      {
        headers: { "X-API-Key": process.env.BUNGIE_API_KEY! },
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) { perkNameCache.set(hash, null); return null; }
    const data = await res.json();
    const name: string | null = data.Response?.displayProperties?.name ?? null;
    perkNameCache.set(hash, name);
    return name;
  } catch {
    perkNameCache.set(hash, null);
    return null;
  }
}

export async function getPerkNames(hashes: number[]): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  await Promise.all(
    [...new Set(hashes)].map(async (hash) => {
      const name = await getPerkName(hash);
      if (name) results.set(hash, name);
    })
  );
  return results;
}

// ── Batch weapon definition lookup ───────────────────────────────────────────

export async function getWeaponDefinitions(
  hashes: number[]
): Promise<Map<number, WeaponDefinition>> {
  const results = new Map<number, WeaponDefinition>();
  await Promise.all(
    hashes.map(async (hash) => {
      const def = await getWeaponDefinition(hash);
      if (def) results.set(hash, def);
    })
  );
  return results;
}
