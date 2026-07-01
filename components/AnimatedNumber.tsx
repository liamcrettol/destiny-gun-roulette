"use client";

import { useEffect, useRef, useState } from "react";

// Counts up from 0 to `value` on mount. No animation library - just
// requestAnimationFrame with an ease-out curve, matching how the rest of the
// app's motion (LoadoutQueue reel spins) is hand-rolled rather than pulled
// from a dependency.
export default function AnimatedNumber({ value, durationMs = 800 }: { value: number; durationMs?: number }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    let raf: number;
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <>{display.toLocaleString()}</>;
}
