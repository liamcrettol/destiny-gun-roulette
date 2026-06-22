"use client";

import { useState, useRef, useCallback } from "react";
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

interface Props {
  intersection: Record<WeaponSlot, number[]>;
  weaponDetails: Record<string, WeaponDetail>;
  currentHashes: Partial<Record<WeaponSlot, number>>;
  onSelectWeapon: (slot: WeaponSlot, hash: number) => void;
  disabled?: boolean;
}

const SLOT_LABELS: Record<WeaponSlot, string> = {
  kinetic: "Kinetic",
  energy: "Energy",
  power: "Power",
};

const TIER_BORDER: Record<number, string> = {
  6: "border-yellow-500",
  5: "border-purple-500/60",
  4: "border-blue-500/60",
};

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

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 text-xs w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-bungie-blue rounded-full"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="text-gray-300 text-xs w-6 text-right">{value}</span>
    </div>
  );
}

function WeaponTooltip({
  hash,
  detail,
  anchorRef,
}: {
  hash: number;
  detail: WeaponDetail;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const barStats = BAR_STATS.filter((s) => detail.stats[s] !== undefined);
  const numStats = NUM_STATS.filter((s) => detail.stats[s] !== undefined);

  return (
    <div className="absolute z-50 left-full top-0 ml-2 w-56 bg-gray-900 border border-bungie-border rounded-xl p-3 shadow-xl pointer-events-none">
      <p className="text-white text-sm font-semibold leading-tight mb-0.5">{detail.name}</p>
      <p className="text-xs text-gray-400 mb-1">{detail.weaponType}</p>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-medium ${detail.tierType === 6 ? "text-yellow-400" : "text-purple-400"}`}>
          {detail.tierName}
        </span>
        <span className={`text-xs ${DAMAGE_COLOR[detail.damageType] ?? "text-gray-300"}`}>
          {detail.damageType}
        </span>
      </div>
      {(barStats.length > 0 || numStats.length > 0) && (
        <div className="space-y-1.5">
          {barStats.map((s) => (
            <StatBar key={s} label={s} value={detail.stats[s]} />
          ))}
          {numStats.map((s) => (
            <div key={s} className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">{s}</span>
              <span className="text-gray-300 text-xs">{detail.stats[s]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeaponCard({
  hash,
  detail,
  isActive,
  onClick,
  disabled,
}: {
  hash: number;
  detail: WeaponDetail;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition ${
          isActive
            ? "border-bungie-blue bg-bungie-blue/20"
            : `${TIER_BORDER[detail.tierType] ?? "border-bungie-border"} bg-bungie-dark hover:bg-gray-700/50`
        } disabled:opacity-40 disabled:cursor-default`}
      >
        <div className="relative w-9 h-9 shrink-0 rounded overflow-hidden bg-gray-800">
          {detail.icon && (
            <Image src={detail.icon} alt={detail.name} fill className="object-cover" unoptimized />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-medium leading-tight truncate">{detail.name}</p>
          <p className="text-gray-400 text-xs truncate">{detail.weaponType}</p>
        </div>
        {isActive && <span className="ml-auto text-bungie-blue text-xs shrink-0">✓</span>}
      </button>
      {hovered && <WeaponTooltip hash={hash} detail={detail} anchorRef={ref} />}
    </div>
  );
}

export default function WeaponPool({
  intersection,
  weaponDetails,
  currentHashes,
  onSelectWeapon,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);

  const slots: WeaponSlot[] = ["kinetic", "energy", "power"];

  const totalWeapons =
    intersection.kinetic.length + intersection.energy.length + intersection.power.length;

  return (
    <div className="bg-bungie-surface border border-bungie-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition"
      >
        <span className="text-white font-semibold text-sm">
          Weapon Browser
          <span className="ml-2 text-gray-500 font-normal text-xs">{totalWeapons} shared weapons</span>
        </span>
        <span className="text-gray-400 text-xs">{open ? "▲ Hide" : "▼ Show"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500 mb-3">
            Click a weapon to pin it to that slot. Hover for stats.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {slots.map((slot) => {
              const hashes = intersection[slot];
              const activeHash = currentHashes[slot];
              return (
                <div key={slot}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      {SLOT_LABELS[slot]}
                    </span>
                    <span className="text-gray-600 text-xs">{hashes.length}</span>
                  </div>
                  <div className="space-y-1 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                    {hashes.length === 0 ? (
                      <p className="text-gray-600 text-xs">No shared weapons</p>
                    ) : (
                      hashes.map((hash) => {
                        const detail = weaponDetails[hash.toString()];
                        if (!detail) return null;
                        return (
                          <WeaponCard
                            key={hash}
                            hash={hash}
                            detail={detail}
                            isActive={activeHash === hash}
                            onClick={() => onSelectWeapon(slot, hash)}
                            disabled={disabled}
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
  );
}
