import { isInventoryFull } from "../equip";
import type { RawWeapon } from "../rawInventory";

describe("isInventoryFull", () => {
  const mockWeapons = (count: number, location: "character" = "character"): RawWeapon[] => {
    return Array.from({ length: count }, (_, i) => ({
      itemHash: 1000 + i,
      itemInstanceId: `instance-${i}`,
      slot: (["kinetic", "energy", "power"][i % 3]) as any,
      location,
      characterId: "test-char-id",
      isEquipped: false,
      lightLevel: 750,
      tierType: 5,
    }));
  };

  it("returns false when character has fewer than 9 weapons", () => {
    const weapons = mockWeapons(8);
    expect(isInventoryFull("test-char-id", weapons)).toBe(false);
  });

  it("returns true when character has 9 weapons", () => {
    const weapons = mockWeapons(9);
    expect(isInventoryFull("test-char-id", weapons)).toBe(true);
  });

  it("returns true when character has more than 9 weapons", () => {
    const weapons = mockWeapons(10);
    expect(isInventoryFull("test-char-id", weapons)).toBe(true);
  });

  it("ignores weapons not on the character", () => {
    const onCharacter = mockWeapons(5);
    const inVault = mockWeapons(5, "vault");
    const weapons = [...onCharacter, ...inVault];
    expect(isInventoryFull("test-char-id", weapons)).toBe(false);
  });

  it("counts equipped items toward inventory limit", () => {
    const weapons = mockWeapons(9);
    weapons[0].isEquipped = true;
    expect(isInventoryFull("test-char-id", weapons)).toBe(true);
  });
});
