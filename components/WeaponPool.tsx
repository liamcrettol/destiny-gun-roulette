"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import type { WeaponSlot } from "@/types/bungie";

type WeaponDetail = {
  name: string;
  icon: string;
  weaponType: string;
  damageType: string;
  tierType: number;
  tierName: string;
  ammoType: string;
  stats: Record<string, number>;
};

type InstancePerk = { instanceId: string; perks: string[]; location: string; characterId?: string };

interface Props {
  intersection: Record<WeaponSlot, number[]>;
  weaponDetails: Record<string, WeaponDetail>;
  instancePerks: Record<string, InstancePerk[]>;
  collectionHashes: Set<number>;
  currentHashes: Partial<Record<WeaponSlot, number>>;
  onSelectWeapon: (slot: WeaponSlot, hash: number) => void;
  disabled?: boolean;
}

const SLOT_LABELS: Record<WeaponSlot, string> = { kinetic: "Kinetic", energy: "Energy", power: "Power" };

const TIER_COLORS: Record<number, { border: string; bg: string; label: string }> = {
  6: { border: "border-yellow-500", bg: "bg-yellow-500/10", label: "text-yellow-400" },
  5: { border: "border-purple-500/50", bg: "bg-purple-900/10", label: "text-purple-400" },
  4: { border: "border-blue-500/40", bg: "bg-blue-900/10", label: "text-blue-400" },
};
const DEFAULT_TIER = { border: "border-bungie-border", bg: "bg-bungie-dark", label: "text-gray-400" };

const DAMAGE_COLOR: Record<string, string> = {
  Kinetic: "text-gray-300",
  Solar: "text-orange-400",
  Arc: "text-blue-300",
  Void: "text-purple-400",
  Stasis: "text-cyan-300",
  Strand: "text-emerald-400",
};

const BAR_STATS = ["Impact", "Range", "Stability", "Handling", "Reload", "Aim Assist", "Zoom"];
const NUM_STATS = ["RPM", "Charge Time", "Magazine"];
const CARD_INLINE_STATS = ["RPM", "Impact", "Range", "Charge Time"];

function sortWeapons(hashes: number[], details: Record<string, WeaponDetail>): number[] {
  return [...hashes].sort((a, b) => {
    const da = details[a.toString()];
    const db = details[b.toString()];
    if (!da || !db) return 0;
    const tierDiff = (db.tierType ?? 5) - (da.tierType ?? 5);
    if (tierDiff !== 0) return tierDiff;
    return da.name.localeCompare(db.name);
  });
}

// ── Floating cursor tooltip ─────────────────────────────────────────────────

interface TooltipState { hash: number; x: number; y: number }

function FloatingTooltip({
  state,
  weaponDetails,
  instancePerks,
  collectionHashes,
}: {
  state: TooltipState;
  weaponDetails: Record<string, WeaponDetail>;
  instancePerks: Record<string, InstancePerk[]>;
  collectionHashes: Set<number>;
}) {
  const detail = weaponDetails[state.hash.toString()];
  if (!detail) return null;

  const barStats = BAR_STATS.filter((s) => detail.stats[s] !== undefined);
  const numStats = NUM_STATS.filter((s) => detail.stats[s] !== undefined);
  const rolls = instancePerks[state.hash.toString()] ?? [];
  const isCollection = collectionHashes.has(state.hash);

  const leftOffset = state.x > window.innerWidth / 2 ? -280 : 16;

  return (
    <div
      className="fixed z-50 w-72 bg-gray-950 border border-bungie-border rounded-xl p-3 shadow-2xl pointer-events-none"
      style={{ left: state.x + leftOffset, top: state.y - 8 }}
    >
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <p className="text-white text-sm font-semibold leading-tight">{detail.name}</p>
        {isCollection && (
          <span className="shrink-0 text-xs bg-amber-500/20 border border-amber-500/50 text-amber-300 rounded px-1.5 py-0.5">
            Collection
          </span>
        )}
      </div>
      <p className="text-gray-400 text-xs mb-1">{detail.weaponType}</p>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-medium ${TIER_COLORS[detail.tierType]?.label ?? DEFAULT_TIER.label}`}>
          {detail.tierName}
        </span>
        <span className="text-gray-600 text-xs">·</span>
        <span className={`text-xs ${DAMAGE_COLOR[detail.damageType] ?? "text-gray-300"}`}>
          {detail.damageType}
        </span>
        {isCollection && (
          <span className="text-xs text-gray-500 italic">pull from collections</span>
        )}
      </div>

      {/* Per-instance perk rolls */}
      {rolls.length > 0 && (
        <div className="mb-3">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1.5">Your Rolls</p>
          <div className="space-y-2">
            {rolls.map((inst) => (
              <div key={inst.instanceId} className="bg-gray-800/60 rounded-lg px-2 py-1.5">
                <p className="text-gray-500 text-xs mb-1 capitalize">
                  {inst.location === "vault" ? "Vault" : "On character"}
                </p>
                <div className="flex flex-wrap gap-1">
                  {inst.perks.map((perk) => (
                    <span
                      key={perk}
                      className="text-xs bg-bungie-blue/20 border border-bungie-blue/40 text-blue-300 rounded px-1.5 py-0.5"
                    >
                      {perk}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Base stats */}
      {(barStats.length > 0 || numStats.length > 0) ? (
        <div className="space-y-1.5">
          {barStats.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="text-gray-400 text-xs w-20 shrink-0">{s}</span>
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-bungie-blue rounded-full" style={{ width: `${Math.min(100, detail.stats[s])}%` }} />
              </div>
              <span className="text-gray-300 text-xs w-6 text-right tabular-nums">{detail.stats[s]}</span>
            </div>
          ))}
          {numStats.map((s) => (
            <div key={s} className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">{s}</span>
              <span className="text-gray-300 text-xs tabular-nums">{detail.stats[s]}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-xs">No stats available</p>
      )}
    </div>
  );
}

// ── Weapon card ─────────────────────────────────────────────────────────────

function WeaponCard({
  hash, detail, isActive, isCollection, perks, onClick, disabled, onHover, onLeave,
}: {
  hash: number; detail: WeaponDetail; isActive: boolean; isCollection: boolean;
  perks: string[]; onClick: () => void; disabled?: boolean;
  onHover: (hash: number, x: number, y: number) => void; onLeave: () => void;
}) {
  const tier = TIER_COLORS[detail.tierType] ?? DEFAULT_TIER;
  const inlineStat = CARD_INLINE_STATS.find((s) => detail.stats[s] !== undefined);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseMove={(e) => onHover(hash, e.clientX, e.clientY)}
      onMouseLeave={onLeave}
      className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition ${
        isActive
          ? "border-bungie-blue bg-bungie-blue/20 shadow-sm shadow-bungie-blue/20"
          : `${tier.border} ${tier.bg} hover:brightness-125`
      } disabled:opacity-40 disabled:cursor-default`}
    >
      {/* Icon */}
      <div className="relative w-12 h-12 shrink-0 rounded overflow-hidden bg-gray-800">
        {detail.icon && (
          <Image src={detail.icon} alt={detail.name} fill className="object-cover" unoptimized />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Name row */}
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <p className="text-white text-xs font-semibold leading-tight">{detail.name}</p>
          <div className="flex items-center gap-1 shrink-0">
            {isCollection && (
              <span className="text-xs bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded px-1 py-0.5 leading-none">
                C
              </span>
            )}
            {isActive && <span className="text-bungie-blue text-sm leading-none">✓</span>}
          </div>
        </div>

        {/* Type + damage + stat */}
        <p className="text-gray-400 text-xs leading-tight truncate">{detail.weaponType}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-xs ${DAMAGE_COLOR[detail.damageType] ?? "text-gray-400"}`}>
            {detail.damageType}
          </span>
          {inlineStat && (
            <span className="text-gray-500 text-xs tabular-nums">
              {inlineStat} {detail.stats[inlineStat]}
            </span>
          )}
        </div>

        {/* Perk pills — shown inline if available */}
        {perks.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {perks.slice(0, 3).map((perk) => (
              <span
                key={perk}
                className="text-xs bg-gray-700/60 border border-gray-600/40 text-gray-300 rounded px-1.5 py-0.5 leading-none"
              >
                {perk}
              </span>
            ))}
            {perks.length > 3 && (
              <span className="text-xs text-gray-500 px-0.5 py-0.5">+{perks.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function WeaponPool({
  intersection, weaponDetails, instancePerks, collectionHashes, currentHashes, onSelectWeapon, disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleHover = useCallback((hash: number, x: number, y: number) => {
    setTooltip({ hash, x, y });
  }, []);
  const handleLeave = useCallback(() => setTooltip(null), []);

  useEffect(() => { if (!open) setTooltip(null); }, [open]);

  const slotList: WeaponSlot[] = ["kinetic", "energy", "power"];
  const totalWeapons = slotList.reduce((n, s) => n + intersection[s].length, 0);
  const collectionCount = collectionHashes.size;

  return (
    <>
      {tooltip && (
        <FloatingTooltip
          state={tooltip}
          weaponDetails={weaponDetails}
          instancePerks={instancePerks}
          collectionHashes={collectionHashes}
        />
      )}

      <div className="bg-bungie-surface border border-bungie-border rounded-xl overflow-hidden">
        {/* Toggle header */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition"
        >
          <span className="text-white font-semibold text-sm flex items-center gap-3">
            Weapon Browser
            <span className="text-gray-500 font-normal text-xs">{totalWeapons} shared weapons</span>
            {collectionCount > 0 && (
              <span className="text-xs bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded px-2 py-0.5">
                +{collectionCount} from collections
              </span>
            )}
          </span>
          <span className="text-gray-400 text-xs">{open ? "▲ Hide" : "▼ Show"}</span>
        </button>

        {open && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-4">
              {slotList.map((slot) => {
                const sorted = sortWeapons(intersection[slot], weaponDetails);
                const activeHash = currentHashes[slot];
                return (
                  <div key={slot} className="min-w-0">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-bungie-border">
                      <span className="text-sm font-bold text-white">{SLOT_LABELS[slot]}</span>
                      <span className="text-gray-500 text-xs">{sorted.length}</span>
                    </div>

                    <div className="space-y-2">
                      {sorted.length === 0 ? (
                        <p className="text-gray-600 text-xs py-2">No shared weapons</p>
                      ) : (
                        sorted.map((hash) => {
                          const detail = weaponDetails[hash.toString()];
                          if (!detail) return null;
                          // Collect best perk roll to show inline (prefer on-character over vault)
                          const rolls = instancePerks[hash.toString()] ?? [];
                          const bestRoll = rolls.find((r) => r.location !== "vault") ?? rolls[0];
                          return (
                            <WeaponCard
                              key={hash}
                              hash={hash}
                              detail={detail}
                              isActive={activeHash === hash}
                              isCollection={collectionHashes.has(hash)}
                              perks={bestRoll?.perks ?? []}
                              onClick={() => onSelectWeapon(slot, hash)}
                              disabled={disabled}
                              onHover={handleHover}
                              onLeave={handleLeave}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
