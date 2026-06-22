"use client";

import Image from "next/image";
import { useState } from "react";
import type { ResolvedWeapon } from "@/types/weapon";

const TIER_BORDER: Record<number, string> = {
  6: "border-yellow-500",
  5: "border-purple-600",
  4: "border-blue-500",
};

export default function WeaponCard({ weapon }: { weapon: ResolvedWeapon }) {
  const [showPerks, setShowPerks] = useState(false);
  const borderClass = TIER_BORDER[weapon.tierType] ?? "border-gray-600";

  return (
    <div
      className={`relative bg-bungie-surface border-2 ${borderClass} rounded-lg overflow-hidden cursor-pointer hover:brightness-110 transition`}
      onClick={() => setShowPerks(!showPerks)}
    >
      {/* Weapon icon */}
      <div className="relative aspect-square w-full max-w-[80px]">
        <Image
          src={weapon.icon}
          alt={weapon.name}
          fill
          className="object-cover"
          unoptimized
        />
      </div>

      {/* Info row */}
      <div className="p-2">
        <p className="text-white text-xs font-semibold leading-tight truncate">
          {weapon.name}
        </p>
        <p className="text-gray-400 text-xs">{weapon.weaponType}</p>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-yellow-400 font-mono">{weapon.lightLevel}</span>
          <span className="text-xs text-gray-500">•</span>
          <span className="text-xs text-gray-400">{weapon.damageType}</span>
        </div>
        {weapon.isEquipped && (
          <span className="text-xs text-bungie-blue mt-0.5 block">Equipped</span>
        )}
        <span className="text-xs text-gray-500 capitalize">{weapon.location}</span>
      </div>

      {/* Perk popup */}
      {showPerks && (
        <div
          className="absolute z-50 left-full top-0 ml-2 w-64 bg-gray-900 border border-bungie-border rounded-lg p-3 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-white font-semibold text-sm mb-2">{weapon.name}</h3>
          <p className="text-gray-400 text-xs mb-3 italic">{weapon.flavorText}</p>

          <div className="space-y-2">
            {weapon.perks.slice(0, 6).map((column, colIdx) => (
              <div key={colIdx} className="flex flex-wrap gap-1">
                {column.filter((p) => p.name).map((perk) => (
                  <div
                    key={perk.hash}
                    className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-xs ${
                      perk.isSelected
                        ? "bg-bungie-blue/20 border border-bungie-blue/50 text-white"
                        : "bg-gray-800 text-gray-400"
                    }`}
                    title={perk.description}
                  >
                    {perk.icon && (
                      <Image
                        src={perk.icon}
                        alt={perk.name}
                        width={14}
                        height={14}
                        unoptimized
                      />
                    )}
                    {perk.name}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Stats */}
          {weapon.stats.length > 0 && (
            <div className="mt-3 space-y-1">
              {weapon.stats.slice(0, 6).map((stat) => (
                <div key={stat.hash} className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs w-20 truncate">
                    {stat.name}
                  </span>
                  <div className="flex-1 bg-gray-700 rounded-full h-1">
                    <div
                      className="bg-bungie-blue h-1 rounded-full"
                      style={{
                        width: `${Math.min(100, (stat.value / stat.displayMaximum) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-white text-xs w-6 text-right">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
