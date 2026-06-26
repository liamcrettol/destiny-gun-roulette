"use client";

import { useState } from "react";
import type { WeaponSlot } from "@/types/bungie";
import { BAR_STATS, NUM_STATS, damageTheme } from "./weaponShared";
import { trimBungieName } from "@/lib/utils";
import PerkIcon from "./PerkIcon";

export interface Perk { name: string; description: string }
export interface RollInstance {
  instanceId: string;
  location: "character" | "vault";
  perkHashes: number[];
  perks: Perk[];
  perkIcons: Record<number, string>;
  barrelHash?: number;
  barrelName?: string;
  barrelIcon?: string;
  magazineHash?: number;
  magazineName?: string;
  magazineIcon?: string;
  masterworkHash?: number;
  masterworkName?: string;
  masterworkIcon?: string;
  stats: Record<string, number>;
  lightLevel: number;
}
export interface MemberRolls {
  userId: string;
  displayName: string;
  isMe: boolean;
  instances: RollInstance[];
  failed?: boolean;
}
export interface SlotRolls {
  itemHash: number;
  damageType: string;
  baseStats: Record<string, number>;
  weaponName?: string;
  weaponIcon?: string;
  members: MemberRolls[];
}
export type RollsData = Partial<Record<WeaponSlot, SlotRolls>>;

const SLOT_LABELS: Record<WeaponSlot, string> = { kinetic: "Kinetic", energy: "Energy", power: "Power" };
const SLOT_ORDER: WeaponSlot[] = ["kinetic", "energy", "power"];

export default function RollDetails({
  rolls,
  chosenInstances,
  onChooseInstance,
  favorites,
  onToggleFavorite,
  loading,
  error,
  onRetry,
}: {
  rolls: RollsData;
  chosenInstances: Partial<Record<WeaponSlot, string>>;
  onChooseInstance: (slot: WeaponSlot, instanceId: string) => void;
  favorites?: Record<string, string>;
  onToggleFavorite?: (slot: WeaponSlot, hash: number, instanceId: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  const [tab, setTab] = useState<WeaponSlot>("kinetic");
  // Which roll's stats are shown on the right. Stale ids (e.g. after switching
  // tabs) simply fall through to the per-slot default below.
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const present = SLOT_ORDER.filter((s) => rolls[s]);

  if (present.length === 0) {
    return (
      <div className="bg-bungie-surface border border-bungie-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">Your Roll vs Fireteam</h2>
          {onRetry && !loading && (
            <button onClick={onRetry} className="text-xs px-2 py-1 rounded border border-bungie-border text-gray-300 hover:border-gray-400 transition">
              Refresh
            </button>
          )}
        </div>
        <p className="text-gray-500 text-xs mt-2">
          {loading ? "Loading your rolls..." : error ? `Couldn't load rolls: ${error}` : "Roll a loadout to see your rolls."}
        </p>
      </div>
    );
  }

  const activeTab = rolls[tab] ? tab : present[0];
  const slot = rolls[activeTab]!;
  const theme = damageTheme(slot.damageType);
  const base = slot.baseStats;

  const members = slot.members;
  const me = members.find((m) => m.isMe);
  const myInstances = me?.instances ?? [];
  const chosenId = chosenInstances[activeTab];
  const myChosen = myInstances.find((i) => i.instanceId === chosenId) ?? myInstances[0];

  // Flat list of every member's rolls for the left rail. The highlighted roll
  // (whose stats fill the right column) defaults to your chosen pick.
  const allRolls = members.flatMap((m) => m.instances.map((inst) => ({ member: m, inst })));
  const defaultHL = me && myChosen ? { member: me, inst: myChosen } : allRolls[0];
  const highlighted = allRolls.find((r) => r.inst.instanceId === highlightId) ?? defaultHL;
  const hl = highlighted?.inst;

  const statRows = BAR_STATS.filter((s) => base[s] !== undefined || (hl && hl.stats[s] !== undefined));
  const numRows = NUM_STATS.filter((s) => s !== "RPM" && s !== "Magazine" && (base[s] !== undefined || (hl && hl.stats[s] !== undefined)));

  // Reserve height for the tallest slot so switching tabs doesn't resize the panel and yank the page.
  const maxStatRows = Math.max(
    ...present.map((s) =>
      BAR_STATS.filter((st) => rolls[s]!.baseStats[st] !== undefined).length
    )
  );
  const anyNumRows = present.some((s) =>
    NUM_STATS.some(
      (st) => st !== "RPM" && st !== "Magazine" && rolls[s]!.baseStats[st] !== undefined
    )
  );

  const selectRoll = (m: MemberRolls, inst: RollInstance) => {
    setHighlightId(inst.instanceId);
    if (m.isMe) onChooseInstance(activeTab, inst.instanceId);
  };

  // A roll's socket icons (barrel, magazine, all perks, masterwork), each with
  // a hover tooltip describing exactly what it does.
  const rollPreview = (inst: RollInstance) => (
    <div className="flex flex-wrap gap-1">
      <PerkIcon icon={inst.barrelIcon} name={inst.barrelName} />
      <PerkIcon icon={inst.magazineIcon} name={inst.magazineName} />
      {inst.perkHashes.map((hash, i) => (
        <PerkIcon key={hash} icon={inst.perkIcons[hash]} name={inst.perks[i]?.name} description={inst.perks[i]?.description} />
      ))}
      <PerkIcon icon={inst.masterworkIcon} name={inst.masterworkName} />
    </div>
  );

  return (
    <div className="bg-bungie-surface border border-bungie-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-bungie-border flex items-center justify-between gap-2">
        <h2 className="text-white font-semibold text-sm">
          Your Roll vs Fireteam {loading && <span className="text-gray-500 font-normal text-xs">· refreshing…</span>}
        </h2>
        {/* Slot tabs */}
        <div className="flex gap-1">
          {present.map((s) => {
            const t = damageTheme(rolls[s]!.damageType);
            const weaponName = rolls[s]!.weaponName || SLOT_LABELS[s];
            const weaponIcon = rolls[s]!.weaponIcon;
            return (
              <button
                key={s}
                onClick={() => setTab(s)}
                className={`px-2.5 py-1 rounded text-xs font-semibold border transition flex items-center gap-1 ${
                  activeTab === s ? `${t.border} ${t.bg} text-white` : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                {weaponIcon && <img src={weaponIcon} alt="" className="w-4 h-4 rounded-sm" />}
                <span className="truncate max-w-[8rem]">{weaponName}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-3 py-3 flex flex-col sm:flex-row gap-3">
        {/* Left rail: every member's rolls, scrollable. Click to inspect; star
            favorites your own rolls. */}
        <div className="w-full sm:w-[18rem] shrink-0 max-h-[20rem] overflow-y-auto pr-1 sm:border-r border-bungie-border/50">
          {members.map((m) => (
            <div key={m.userId} className="mb-2 last:mb-0">
              <p className={`text-xs font-semibold truncate px-1 mb-1 ${m.isMe ? theme.text : "text-gray-200"}`}>
                {m.isMe ? "You" : trimBungieName(m.displayName)}
              </p>
              {m.failed ? (
                <p className="text-gray-500 text-[10px] italic px-1">couldn&apos;t load</p>
              ) : m.instances.length === 0 ? (
                <p className="text-gray-500 text-[10px] px-1">—</p>
              ) : (
                m.instances.map((inst) => {
                  const isHL = inst.instanceId === hl?.instanceId;
                  const fav = favorites?.[slot.itemHash.toString()] === inst.instanceId;
                  return (
                    <div
                      key={inst.instanceId}
                      onClick={() => selectRoll(m, inst)}
                      className={`flex items-center justify-between gap-2 rounded px-1.5 py-1 cursor-pointer border transition ${
                        isHL ? `${theme.border} ${theme.bg}` : "border-transparent hover:bg-bungie-border/20"
                      }`}
                    >
                      {rollPreview(inst)}
                      {m.isMe && onToggleFavorite && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleFavorite(activeTab, slot.itemHash, inst.instanceId); }}
                          title={fav ? "Unfavorite" : "Favorite (auto-picked on roll)"}
                          className={`shrink-0 text-sm leading-none ${fav ? "text-yellow-400" : "text-gray-500 hover:text-yellow-400"}`}
                        >
                          {fav ? "★" : "☆"}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>

        {/* Right column: stat bars for the highlighted roll vs the weapon base. */}
        <div className="flex-1 min-w-0">
          {hl ? (
            <>
              <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-1.5">
                {highlighted?.member.isMe ? "Your roll" : `${trimBungieName(highlighted!.member.displayName)}'s roll`}
              </p>
              <div className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 items-center">
                {statRows.map((s) => {
                  const v = hl.stats[s] ?? base[s];
                  const hasBase = base[s] !== undefined;
                  const delta = hasBase ? v - base[s] : 0;
                  // Segmented bar: element fill up to the lower of base/value,
                  // then the perk difference in green (gain) or red (loss).
                  const lo = Math.min(100, Math.max(0, Math.min(v, hasBase ? base[s] : v)));
                  const hi = Math.min(100, Math.max(0, Math.max(v, hasBase ? base[s] : v)));
                  return (
                    <div key={s} className="contents">
                      <div className="text-gray-400 text-[11px]">{s}</div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-gray-700/80 rounded-full overflow-hidden flex">
                          <div className="h-full bg-gray-400" style={{ width: `${lo}%` }} />
                          {hi > lo && (
                            <div className={`h-full ${delta >= 0 ? "bg-green-400" : "bg-red-500/80"}`} style={{ width: `${hi - lo}%` }} />
                          )}
                        </div>
                        <span className="w-5 text-right tabular-nums text-[11px] text-gray-300">{v}</span>
                        {/* Always reserve the delta column so every bar lines up */}
                        <span className={`w-6 text-right text-[9px] tabular-nums ${delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-transparent"}`}>
                          {delta !== 0 ? (delta > 0 ? `+${delta}` : delta) : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Reserve height for the tallest slot so switching tabs doesn't resize the panel and yank the page. */}
                {Array.from({ length: Math.max(0, maxStatRows - statRows.length) }).map((_, i) => (
                  <div key={`pad-${i}`} className="contents" aria-hidden="true">
                    <div className="text-[11px] invisible">—</div>
                    <div className="text-[11px] invisible">—</div>
                  </div>
                ))}
              </div>

              {/* Intrinsic numeric stats */}
              {anyNumRows && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-2 border-t border-bungie-border/50 min-h-[1.25rem]">
                  {numRows.map((s) => (
                    <div key={s} className="flex items-center gap-1.5">
                      <span className="text-gray-500 text-[11px]">{s}</span>
                      <span className="text-gray-300 text-[11px] tabular-nums font-medium">{hl.stats[s] ?? base[s]}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-xs">No rolls to show.</p>
          )}
        </div>
      </div>
    </div>
  );
}
