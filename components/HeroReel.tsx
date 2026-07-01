"use client";

import { useEffect, useState } from "react";
import { Flame, Zap, Sparkles } from "lucide-react";
import { DAMAGE_THEME } from "./weaponShared";

// Purely decorative "loadout roll" for the signed-out landing hero - there's
// no session yet to pull real weapons for, so each slot independently cycles
// through a few of Destiny's real damage-type colors/icons (same DAMAGE_THEME
// used throughout the app) rather than showing fake weapon data.
const CYCLE = [
  { type: "Solar", Icon: Flame },
  { type: "Arc", Icon: Zap },
  { type: "Void", Icon: Sparkles },
] as const;

const SLOTS: Array<{ label: string; intervalMs: number }> = [
  { label: "Kinetic", intervalMs: 1800 },
  { label: "Energy", intervalMs: 2100 },
  { label: "Power", intervalMs: 2400 },
];

function ReelSlot({ intervalMs }: { intervalMs: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % CYCLE.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  const { type, Icon } = CYCLE[index];
  const theme = DAMAGE_THEME[type];

  return (
    <div
      key={index}
      className={`w-14 h-14 rounded-xl border flex items-center justify-center transition-colors ${theme.border} ${theme.bg} animate-bounce-in`}
    >
      <Icon size={24} className={theme.text} />
    </div>
  );
}

export default function HeroReel() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      {SLOTS.map((slot) => (
        <div key={slot.label} className="flex flex-col items-center gap-1.5">
          <ReelSlot intervalMs={slot.intervalMs} />
          <span className="text-[10px] uppercase tracking-wider text-gray-500">{slot.label}</span>
        </div>
      ))}
    </div>
  );
}
