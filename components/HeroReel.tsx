"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { damageTheme } from "./weaponShared";
import type { HeroWeaponSample } from "@/lib/bungie/definitions";

// Purely decorative "loadout roll" for the signed-out landing hero, spinning
// through real weapon icons (sampled server-side from the static weapons
// table - see getRandomWeaponSample) using the exact scroll-and-land reel
// mechanic WeaponSlotContent uses for real rolls in LoadoutQueue.tsx, just
// keyed off a random interval instead of an actual captain's roll.
const REEL_ITEM_H = 64;
const REEL_PRE_COUNT = 10;

const SLOTS: Array<{ intervalMs: number; staggerMs: number }> = [
  { intervalMs: 2800, staggerMs: 0 },
  { intervalMs: 2800, staggerMs: 160 },
  { intervalMs: 2800, staggerMs: 320 },
];

function randomIndex(len: number, exclude?: number): number {
  if (len <= 1) return 0;
  let i = Math.floor(Math.random() * len);
  while (i === exclude) i = Math.floor(Math.random() * len);
  return i;
}

function ReelSlot({ weapons, intervalMs, staggerMs }: { weapons: HeroWeaponSample[]; intervalMs: number; staggerMs: number }) {
  const [targetIndex, setTargetIndex] = useState(() => randomIndex(weapons.length));
  const [reelItems, setReelItems] = useState<number[]>([targetIndex]);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);
  const reelRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Advance to a new random target on an interval.
  useEffect(() => {
    const id = setInterval(() => {
      setTargetIndex((i) => randomIndex(weapons.length, i));
    }, intervalMs);
    return () => clearInterval(id);
  }, [weapons.length, intervalMs]);

  // Build the pre-roll reel once the target changes, after this slot's stagger delay.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const staggerTimer = setTimeout(() => {
      const randoms = Array.from({ length: REEL_PRE_COUNT }, () => randomIndex(weapons.length));
      setReelItems([...randoms, targetIndex]);
      setSpinning(true);
      setLanded(false);
    }, staggerMs);
    return () => clearTimeout(staggerTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIndex]);

  // Kick off the CSS scroll once reelItems + spinning are set.
  useEffect(() => {
    if (!spinning || reelItems.length < 2) return;
    const reel = reelRef.current;
    if (!reel) return;

    const targetY = -((reelItems.length - 1) * REEL_ITEM_H);
    reel.style.transition = "none";
    reel.style.transform = "translateY(0)";

    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        reel.style.transition = "transform 900ms cubic-bezier(0.1, 0.6, 0.3, 1)";
        reel.style.transform = `translateY(${targetY}px)`;
      });
    });

    const landTimer = setTimeout(() => {
      setSpinning(false);
      setReelItems([targetIndex]);
      const r = reelRef.current;
      if (r) { r.style.transition = "none"; r.style.transform = "translateY(0)"; }
      setLanded(true);
      setTimeout(() => setLanded(false), 600);
    }, 950);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(landTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, reelItems]);

  const theme = damageTheme(weapons[targetIndex]?.damageType);

  return (
    <div
      className={`relative rounded-xl border overflow-hidden shrink-0 bg-gray-800 transition-shadow duration-300 ${theme.border} ${
        landed ? "animate-slot-land" : ""
      }`}
      style={{ width: REEL_ITEM_H, height: REEL_ITEM_H }}
    >
      <div
        ref={reelRef}
        style={{ willChange: "transform", filter: "blur(3px)" }}
      >
        {reelItems.map((wi, i) => (
          <div key={i} style={{ width: REEL_ITEM_H, height: REEL_ITEM_H, position: "relative" }}>
            <Image src={weapons[wi].icon} alt="" fill className="object-cover" unoptimized />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HeroReel({ weapons }: { weapons: HeroWeaponSample[] }) {
  if (weapons.length === 0) return null;

  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      {SLOTS.map((slot, i) => (
        <ReelSlot key={i} weapons={weapons} intervalMs={slot.intervalMs} staggerMs={slot.staggerMs} />
      ))}
    </div>
  );
}
