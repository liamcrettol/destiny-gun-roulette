// Builds data/best-rolls/archetype-perk-pools.json from Bungie's live manifest.
//
// For every legendary weapon, resolves its frame (intrinsic socket 0) and the
// actual perk pools at barrel(1) / magazine(2) / trait col1(3) / trait col2(4),
// then unions those pools across every weapon sharing the same
// (weaponType, frame) - e.g. all "Hand Cannon" + "Adaptive Frame" guns share
// the same barrel/mag/trait plug sets. One-off exotic "frames" (weaponCount < 2)
// are dropped since they aren't a real shared archetype.
//
// This feeds the best-rolls spreadsheet's per-row dropdowns (see
// data/best-rolls/README.md) and, later, the in-app "best roll" matcher.
//
// Run: node scripts/build-archetype-pools.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const PLATFORM = "https://www.bungie.net/Platform/Destiny2/Manifest/";
const CDN = "https://www.bungie.net";
const OUT_DIR = "data/best-rolls";

function apiHeaders() {
  return process.env.BUNGIE_API_KEY ? { "X-API-Key": process.env.BUNGIE_API_KEY } : {};
}

function poolNames(entry, all, plugSets) {
  const setHash = entry?.randomizedPlugSetHash || entry?.reusablePlugSetHash;
  if (!setHash || !plugSets[setHash]) return [];
  return plugSets[setHash].reusablePlugItems
    .map((p) => all[p.plugItemHash]?.displayProperties?.name)
    .filter(Boolean);
}

async function main() {
  const manifestRes = await fetch(PLATFORM, { headers: apiHeaders() });
  if (!manifestRes.ok) throw new Error(`Manifest endpoint ${manifestRes.status}`);
  const manifest = await manifestRes.json();
  const itemPath = manifest.Response.jsonWorldComponentContentPaths.en.DestinyInventoryItemDefinition;
  const plugSetPath = manifest.Response.jsonWorldComponentContentPaths.en.DestinyPlugSetDefinition;

  console.log("Downloading item + plugset definitions...");
  const all = await (await fetch(`${CDN}${itemPath}`)).json();
  const plugSets = await (await fetch(`${CDN}${plugSetPath}`)).json();

  const result = {};

  for (const key in all) {
    const def = all[key];
    if (def.itemType !== 3) continue; // weapons only
    if (def.inventory?.tierType !== 5) continue; // legendary only
    if (def.redacted) continue;
    const entries = def.sockets?.socketEntries;
    if (!entries?.length) continue;

    const weaponType = def.itemTypeDisplayName ?? "Unknown";
    const frameHash = entries[0]?.singleInitialItemHash;
    const frameName = (frameHash ? all[frameHash] : null)?.displayProperties?.name || "(no frame)";

    result[weaponType] ??= {};
    result[weaponType][frameName] ??= {
      count: 0, examples: [],
      barrels: new Set(), magazines: new Set(), perks1: new Set(), perks2: new Set(), origins: new Set(),
    };
    const b = result[weaponType][frameName];
    b.count++;
    if (b.examples.length < 3 && def.displayProperties?.name) b.examples.push(def.displayProperties.name);

    poolNames(entries[1], all, plugSets).forEach((n) => b.barrels.add(n));
    poolNames(entries[2], all, plugSets).forEach((n) => b.magazines.add(n));
    poolNames(entries[3], all, plugSets).forEach((n) => b.perks1.add(n));
    poolNames(entries[4], all, plugSets).forEach((n) => b.perks2.add(n));
    // Origin traits are usually per-weapon (drop source), not per-archetype -
    // only keep small pools; large ones are unrelated "keepsake" plug sets
    // that some craftable weapons reuse this socket index for.
    const originNames = poolNames(entries[5], all, plugSets);
    if (originNames.length > 0 && originNames.length <= 50) originNames.forEach((n) => b.origins.add(n));
  }

  const out = {};
  for (const wt of Object.keys(result).sort()) {
    const frames = Object.entries(result[wt]).filter(([, v]) => v.count >= 2);
    if (frames.length === 0) continue;
    out[wt] = frames
      .sort((a, b) => b[1].count - a[1].count)
      .map(([frame, v]) => ({
        frame,
        weaponCount: v.count,
        examples: v.examples,
        barrels: [...v.barrels].sort(),
        magazines: [...v.magazines].sort(),
        perks1: [...v.perks1].sort(),
        perks2: [...v.perks2].sort(),
        origins: [...v.origins].sort(),
      }));
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/archetype-perk-pools.json`, JSON.stringify(out, null, 2));
  const totalFrames = Object.values(out).reduce((n, arr) => n + arr.length, 0);
  console.log(`Wrote ${OUT_DIR}/archetype-perk-pools.json: ${Object.keys(out).length} weapon types, ${totalFrames} archetypes.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
