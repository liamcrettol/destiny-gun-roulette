import { isInventoryFull, findLowestLightWeapon } from "../equip";
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

describe("findLowestLightWeapon", () => {
  const mockWeapons = (
    characterId: string,
    counts: { light: number; count: number }[] = []
  ): RawWeapon[] => {
    let id = 0;
    return counts.flatMap(({ light, count }) =>
      Array.from({ length: count }, () => ({
        itemHash: 1000 + id,
        itemInstanceId: `instance-${id++}`,
        slot: "kinetic" as const,
        location: "character" as const,
        characterId,
        isEquipped: false,
        lightLevel: light,
        tierType: 5,
      }))
    );
  };

  it("returns the weapon with lowest light level", () => {
    const weapons = mockWeapons("char-1", [
      { light: 760, count: 2 },
      { light: 750, count: 1 },
      { light: 770, count: 1 },
    ]);
    const result = findLowestLightWeapon("char-1", weapons);
    expect(result?.lightLevel).toBe(750);
  });

  it("returns null when no weapons available on character", () => {
    const weapons = mockWeapons("char-1", [{ light: 760, count: 0 }]);
    const result = findLowestLightWeapon("char-1", weapons);
    expect(result).toBeNull();
  });

  it("ignores vault weapons", () => {
    const charWeapons = mockWeapons("char-1", [{ light: 750, count: 2 }]);
    const vaultWeapons: RawWeapon[] = [
      {
        itemHash: 2000,
        itemInstanceId: "vault-weapon",
        slot: "kinetic",
        location: "vault",
        isEquipped: false,
        lightLevel: 700,
        tierType: 5,
      },
    ];
    const result = findLowestLightWeapon("char-1", [...charWeapons, ...vaultWeapons]);
    expect(result?.lightLevel).toBe(750);
  });

  it("ignores equipped weapons", () => {
    const weapons = mockWeapons("char-1", [{ light: 750, count: 2 }]);
    weapons[0].isEquipped = true;
    const result = findLowestLightWeapon("char-1", weapons);
    expect(result?.lightLevel).toBe(750);
    expect(result?.itemInstanceId).toBe("instance-1");
  });

  it("returns null when only equipped weapons exist", () => {
    const weapons = mockWeapons("char-1", [{ light: 750, count: 1 }]);
    weapons[0].isEquipped = true;
    const result = findLowestLightWeapon("char-1", weapons);
    expect(result).toBeNull();
  });

  it("excludes specified item instance IDs", () => {
    const weapons = mockWeapons("char-1", [
      { light: 750, count: 1 },
      { light: 740, count: 1 },
    ]);
    const result = findLowestLightWeapon(
      "char-1",
      weapons,
      new Set(["instance-0"])
    );
    expect(result?.lightLevel).toBe(740);
  });
});
