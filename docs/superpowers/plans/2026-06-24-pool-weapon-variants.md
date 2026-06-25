# Pool Weapon Variants at Intersection Level Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the intersection API to include weapons when all members own *some variant* of it, not requiring the exact same itemHash, enabling more weapons to be rollable when variants (re-releases, Adept, craftable) are present.

**Architecture:** The intersection API (Phase 4) currently does exact-hash matching across members. We'll refactor it to: (1) identify all unique weapons by grouping variants using `getWeaponGroupHashes`, (2) check if every member owns at least one variant of each weapon, (3) pick a representative hash for each weapon group, and (4) return those representatives. This mirrors the pooling logic already in place for the display/equip paths (rolls API).

**Tech Stack:** TypeScript, Next.js API routes, Bungie API, `getWeaponGroupHashes` from `lib/bungie/definitions.ts`

---

## File Structure

- **Modify:** `app/api/roulette/intersection/route.ts` (Phase 4: refactor exact-hash intersection → variant-pooled intersection)
  - Add helper function to build variant-to-canonical mapping
  - Update Phase 4 logic to use variant pooling instead of exact matching
  - Ensures representative hashes are returned for downstream consumption

---

## Implementation Tasks

### Task 1: Add variant pooling helper function

**Files:**
- Modify: `app/api/roulette/intersection/route.ts:1-60` (add import and helper function)

- [ ] **Step 1: Add getWeaponGroupHashes import**

At the top of the file, update the import from `lib/bungie/definitions`:

```typescript
import {
  getWeaponDefinitions,
  getPerkNames,
  getPerkIcons,
  flushDefinitionCache,
  getWeaponGroupHashes,
} from "@/lib/bungie/definitions";
```

- [ ] **Step 2: Add variant pooling helper function**

Add this helper function after the `asAnyArray` function (after line 56):

```typescript
/**
 * Groups weapon hashes into variant groups (re-releases, Adept, craftable variants).
 * For each hash, returns all variants including itself.
 * Deduplicates across all input hashes.
 */
function buildVariantGroups(
  hashes: Iterable<number>
): Map<number, Set<number>> {
  const variantGroups = new Map<number, Set<number>>();
  const seen = new Set<number>();

  for (const hash of hashes) {
    if (seen.has(hash)) continue;
    const variants = getWeaponGroupHashes(hash);
    const variantSet = new Set(variants);
    for (const v of variants) {
      if (!seen.has(v)) {
        variantSet.forEach((vv) => seen.add(vv));
        // All variants in this group map to the same set
        variantGroups.set(v, variantSet);
      }
    }
  }

  return variantGroups;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/roulette/intersection/route.ts
git commit -m "feat: add variant pooling helper for weapon grouping"
```

---

### Task 2: Refactor Phase 4 to use variant pooling

**Files:**
- Modify: `app/api/roulette/intersection/route.ts:245-259` (Phase 4: intersection logic)

- [ ] **Step 1: Replace exact-hash intersection with variant pooling**

Replace lines 245-259 (the current Phase 4 intersection logic) with this variant-pooling version:

```typescript
    // ── Phase 4: Inventory intersection with variant pooling ─────────────────

    // Collect all weapon hashes per slot from all members
    const allHashesBySlot: Record<WeaponSlot, Set<number>> = {
      kinetic: new Set(),
      energy: new Set(),
      power: new Set(),
    };
    for (const sets of memberSlotSets.values()) {
      for (const slot of slots) {
        sets[slot].forEach((h) => allHashesBySlot[slot].add(h));
      }
    }

    // Build variant groups from all hashes
    const allHashesFlat = new Set<number>();
    for (const slot of slots) {
      allHashesBySlot[slot].forEach((h) => allHashesFlat.add(h));
    }
    const variantGroups = buildVariantGroups(allHashesFlat);

    // For each variant group, check if every member owns at least one variant
    const intersection: Record<WeaponSlot, Set<number>> = {
      kinetic: new Set(),
      energy: new Set(),
      power: new Set(),
    };

    const processedGroups = new Set<Set<number>>();

    for (const slot of slots) {
      const memberSets = [...memberSlotSets.values()].map((s) => s[slot]);
      if (memberSets.length === 0) continue;

      for (const hash of allHashesBySlot[slot]) {
        const variantSet = variantGroups.get(hash);
        if (!variantSet || processedGroups.has(variantSet)) continue;

        // Check if every member owns at least one variant of this weapon
        const allMembersHaveVariant = memberSets.every((memberSet) => {
          for (const variant of variantSet) {
            if (memberSet.has(variant)) return true;
          }
          return false;
        });

        if (allMembersHaveVariant) {
          // Use the hash itself as the representative
          intersection[slot].add(hash);
          processedGroups.add(variantSet);
        }
      }
    }
```

- [ ] **Step 2: Run type check to verify no errors**

```bash
npm run type-check
```

Expected: No TypeScript errors related to the intersection changes.

- [ ] **Step 3: Commit**

```bash
git add app/api/roulette/intersection/route.ts
git commit -m "feat: pool weapon variants in intersection using variant grouping

When all members own at least one variant of a weapon (re-release,
Adept, craftable), that weapon is now included in the intersection.
Previously, only weapons where everyone owned the exact same hash
were included, limiting the rollable pool."
```

---

### Task 3: Test variant pooling locally

**Files:**
- Test: Run the app locally and verify rolling behavior

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Expected: Server starts on `http://localhost:3000` without errors.

- [ ] **Step 2: Navigate to the app and create/join a lobby**

- Create a new lobby or join an existing one
- Ensure at least 2 members are in the lobby

- [ ] **Step 3: Verify intersection includes variant weapons**

- Check the browser console Network tab → `/api/roulette/intersection` response
- Verify the `intersection` object includes weapons where members own different variants
- For example, if Member A owns "Austringer" (original) and Member B owns "Austringer (Adept)", the intersection should include it

Expected: The intersection now includes weapon groups where variants are present, expanding the rollable pool.

- [ ] **Step 4: Test rolling and equipping**

- Initiate a roll (click "Roll" or equivalent)
- Verify that the rolled weapon is equippable by all members
- Equip the rolled weapon
- Verify equip succeeds without errors for all members

Expected: Rolling and equipping work correctly with variant hashes.

- [ ] **Step 5: Verify no regressions**

- Test rolling multiple times to ensure consistency
- Check that weapons still equip correctly (not silently skipped for any member)
- Verify the lobby still functions normally (no crashes, API errors)

Expected: Game-critical rolling and equip paths work as before, with expanded pool.

- [ ] **Step 6: Commit test verification**

```bash
git add .
git commit -m "test: verify variant pooling in intersection works locally

Tested rolling and equipping with weapon variants. Confirmed:
- Intersection now includes weapons where members own different variants
- Rolling works correctly with variant hashes
- Equip functionality unchanged and working"
```

---

## Plan Self-Review

✅ **Spec coverage:**
- Requirement: "Update intersection API to pool weapon variants" → Task 2 (refactor Phase 4)
- Requirement: "When all members own some variant, include it" → Task 2 (variant group checking)
- Requirement: "Store a representative hash for the roll" → Task 2 (representative selection per slot)
- Requirement: "Must maintain game-critical functionality" → Task 3 (local testing)
- Requirement: "Needs local testing before merge" → Task 3 (rolling + equip verification)

✅ **Placeholder scan:**
- No "TBD", "TODO", "implement later" placeholders
- All code steps have complete, production-ready code
- All test steps have exact commands and expected outputs
- All commits use descriptive messages

✅ **Type consistency:**
- `variantGroups` is `Map<number, Set<number>>` consistently
- `processedGroups` is `Set<Set<number>>` for tracking variant sets
- `allHashesBySlot` is `Record<WeaponSlot, Set<number>>` matching existing patterns
- `intersection` structure unchanged (same as original)
