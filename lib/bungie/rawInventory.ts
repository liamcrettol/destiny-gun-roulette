import { bungieGet } from "./client";
import type { BungieProfileResponse } from "@/types/bungie";
import { ALL_WEAPON_BUCKETS, bucketToSlot } from "@/types/bungie";
import type { WeaponSlot } from "@/types/bungie";

export interface RawWeapon {
  itemHash: number;
  itemInstanceId: string;
  slot: WeaponSlot;
  location: "character" | "vault";
  characterId?: string;
  isEquipped: boolean;
  lightLevel: number;
}

const PROFILE_COMPONENTS = [200, 201, 205, 102, 300].join(",");

export async function getRawWeapons(
  membershipType: number,
  membershipId: string,
  accessToken: string
): Promise<RawWeapon[]> {
  const profile = await bungieGet<BungieProfileResponse>(
    `/Destiny2/${membershipType}/Profile/${membershipId}/?components=${PROFILE_COMPONENTS}`,
    accessToken
  );

  const weapons: RawWeapon[] = [];
  const instances = profile.itemComponents?.instances?.data ?? {};

  function processItems(
    items: BungieProfileResponse["characterInventories"]["data"][string]["items"],
    location: "character" | "vault",
    characterId?: string,
    equippedIds?: Set<string>
  ) {
    for (const item of items) {
      if (!ALL_WEAPON_BUCKETS.has(item.bucketHash as 1498876634 | 2465295065 | 953998645)) continue;
      const slot = bucketToSlot(item.bucketHash);
      if (!slot) continue;
      const instance = instances[item.itemInstanceId];
      weapons.push({
        itemHash: item.itemHash,
        itemInstanceId: item.itemInstanceId,
        slot,
        location,
        characterId,
        isEquipped: equippedIds?.has(item.itemInstanceId) ?? false,
        lightLevel: instance?.primaryStat?.value ?? 0,
      });
    }
  }

  // Equipped + inventory per character
  for (const [charId, charEquip] of Object.entries(profile.characterEquipment?.data ?? {})) {
    const equippedIds = new Set(charEquip.items.map((i) => i.itemInstanceId));
    processItems(charEquip.items, "character", charId, equippedIds);
    processItems(profile.characterInventories?.data[charId]?.items ?? [], "character", charId, equippedIds);
  }

  // Vault
  processItems(profile.profileInventory?.data?.items ?? [], "vault");

  return weapons;
}
