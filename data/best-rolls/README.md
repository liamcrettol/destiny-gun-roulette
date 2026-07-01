# Best Rolls dataset

Crowd-sourced "best roll per archetype" data for the group, feeding a future
in-app highlight on the Roll Comparison screen.

## Files

- **`best-rolls-template.xlsx`** — the sheet everyone fills out. One row per
  weapon archetype (94 rows: e.g. Hand Cannon / Adaptive Frame, Shotgun /
  Aggressive Frame). Barrel/Magazine/Perk 1/Perk 2/Origin columns are
  dropdowns scoped to exactly what that archetype can actually roll — see the
  "Instructions" tab in the workbook.
- **`archetype-perk-pools.json`** — the raw per-archetype perk pools pulled
  from Bungie's live manifest. This is what the dropdowns are generated from,
  and later becomes the source data for matching a rolled weapon to its
  archetype in-app.

## Regenerating the pool data

Weapon archetypes and their perk pools change with each expansion/season.
Regenerate before re-issuing the template:

```bash
node scripts/build-archetype-pools.mjs
```

This overwrites `archetype-perk-pools.json` from the current Bungie manifest.
Re-run the spreadsheet build after (script not yet checked in — ask Claude to
regenerate `best-rolls-template.xlsx` from the updated JSON) so the dropdowns
stay in sync. **Don't hand-edit `archetype-perk-pools.json`.**

## Workflow

1. Everyone fills out rows in `best-rolls-template.xlsx` for archetypes they
   have opinions on (no need to complete all 94 — partial is fine).
2. Once there's real data, it gets imported into the app as a static dataset
   keyed by (weapon type, frame), which the Roll Comparison screen uses to
   badge a rolled instance that matches the curated "ideal" perk combo.
