import { bungiePost } from "./client";
import type { WeaponSlot } from "@/types/bungie";
import type { ApplyResult } from "@/types/lobby";
import type { RawWeapon } from "./rawInventory";

// A transfer fails with this Bungie error code when the destination bucket is
// full (no room on the character for another weapon of that slot).
function isNoRoomError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return msg.includes("1642") || msg.includes("no room") || msg.includes("destinationfull");
}

interface TransferItemRequest {
  itemReferenceHash: number;
  stackSize: number;
  transferToVault: boolean;
  itemId: string;
  characterId: string;
  membershipType: number;
}

interface EquipItemsRequest {
  itemIds: string[];
  characterId: string;
  membershipType: number;
}

interface EquipItemsResponse {
  equipResults: Array<{
    itemInstanceId: string;
    equipStatus: number; // 1 = success
  }>;
}

export interface WeaponToApply {
  itemHash: number;
  itemInstanceId: string;
  slot: WeaponSlot;
  location: "character" | "vault" | "postmaster";
  characterId?: string;
}

/**
 * Move a weapon from vault to the target character, then equip it.
 * If the weapon is already on the character, skip the transfer.
 */
export async function applyWeapons(
  weapons: WeaponToApply[],
  targetCharacterId: string,
  membershipType: number,
  accessToken: string,
  userId: string,
  displayName: string,
  // The player's full weapon list, used to auto-make-room (farming style) when
  // the target character's weapon slot is full.
  roster: RawWeapon[] = []
): Promise<ApplyResult[]> {
  const results: ApplyResult[] = [];

  // Instances we must never shove to the vault to make room: the loadout itself.
  const loadoutInstanceIds = new Set(weapons.map((w) => w.itemInstanceId));
  // Track instances already moved to the vault this run so we don't pick them again.
  const movedToVault = new Set<string>();

  // Move one non-equipped, non-loadout weapon of this slot off the target
  // character into the vault, freeing a bucket slot. Returns false if none found.
  async function makeRoom(slot: WeaponSlot): Promise<boolean> {
    const candidate = roster.find(
      (w) =>
        w.slot === slot &&
        w.location === "character" &&
        w.characterId === targetCharacterId &&
        !w.isEquipped &&
        !loadoutInstanceIds.has(w.itemInstanceId) &&
        !movedToVault.has(w.itemInstanceId)
    );
    if (!candidate) return false;
    try {
      await bungiePost<unknown>(
        "/Destiny2/Actions/Items/TransferItem/",
        accessToken,
        {
          itemReferenceHash: candidate.itemHash,
          stackSize: 1,
          transferToVault: true,
          itemId: candidate.itemInstanceId,
          characterId: targetCharacterId,
          membershipType,
        } satisfies TransferItemRequest
      );
      movedToVault.add(candidate.itemInstanceId);
      return true;
    } catch {
      return false;
    }
  }

  async function moveToCharacter(weapon: WeaponToApply) {
    // Items on another character must first go to the vault
    if (weapon.location === "character" && weapon.characterId && weapon.characterId !== targetCharacterId) {
      await bungiePost<unknown>(
        "/Destiny2/Actions/Items/TransferItem/",
        accessToken,
        {
          itemReferenceHash: weapon.itemHash,
          stackSize: 1,
          transferToVault: true,
          itemId: weapon.itemInstanceId,
          characterId: weapon.characterId,
          membershipType,
        } satisfies TransferItemRequest
      );
    }
    // Move from vault to target character
    await bungiePost<unknown>(
      "/Destiny2/Actions/Items/TransferItem/",
      accessToken,
      {
        itemReferenceHash: weapon.itemHash,
        stackSize: 1,
        transferToVault: false,
        itemId: weapon.itemInstanceId,
        characterId: targetCharacterId,
        membershipType,
      } satisfies TransferItemRequest
    );
  }

  // Step 1: move weapons to the target character (from vault or another character)
  for (const weapon of weapons) {
    const needsTransfer =
      weapon.location === "vault" ||
      (weapon.location === "character" && weapon.characterId !== targetCharacterId);

    if (!needsTransfer) continue;

    try {
      await moveToCharacter(weapon);
    } catch (err) {
      // Bucket full? Make room by vaulting a spare weapon of that slot, then retry.
      if (isNoRoomError(err) && (await makeRoom(weapon.slot))) {
        try {
          await moveToCharacter(weapon);
          continue; // success on retry
        } catch (retryErr) {
          err = retryErr;
        }
      }
      const friendly = isNoRoomError(err)
        ? "Inventory full and no spare weapon to move - clear a slot, then Apply again"
        : err instanceof Error ? err.message : "Transfer failed";
      results.push({
        user_id: userId,
        display_name: displayName,
        slot: weapon.slot,
        item_hash: weapon.itemHash,
        success: false,
        error: friendly,
      });
    }
  }

  // Step 2: equip all three at once
  const itemIdsToEquip = weapons
    .filter(
      (w) =>
        !results.find((r) => r.slot === w.slot && r.success === false)
    )
    .map((w) => w.itemInstanceId);

  if (itemIdsToEquip.length === 0) return results;

  try {
    const equipRes = await bungiePost<EquipItemsResponse>(
      "/Destiny2/Actions/Items/EquipItems/",
      accessToken,
      {
        itemIds: itemIdsToEquip,
        characterId: targetCharacterId,
        membershipType,
      } satisfies EquipItemsRequest
    );

    for (const weapon of weapons) {
      if (results.find((r) => r.slot === weapon.slot)) continue;
      const equipResult = equipRes.equipResults.find(
        (r) => r.itemInstanceId === weapon.itemInstanceId
      );
      results.push({
        user_id: userId,
        display_name: displayName,
        slot: weapon.slot,
        item_hash: weapon.itemHash,
        success: equipResult?.equipStatus === 1,
        error:
          equipResult?.equipStatus !== 1
            ? `Equip status: ${equipResult?.equipStatus}`
            : undefined,
      });
    }
  } catch (err) {
    for (const weapon of weapons) {
      if (results.find((r) => r.slot === weapon.slot)) continue;
      results.push({
        user_id: userId,
        display_name: displayName,
        slot: weapon.slot,
        item_hash: weapon.itemHash,
        success: false,
        error: err instanceof Error ? err.message : "Equip failed",
      });
    }
  }

  return results;
}
