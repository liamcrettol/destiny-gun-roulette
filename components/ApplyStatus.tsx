"use client";

import type { ApplyResult } from "@/types/lobby";
import { trimBungieName } from "@/lib/utils";

const SLOT_LABELS: Record<string, string> = {
  kinetic: "Kinetic",
  energy: "Energy",
  power: "Power",
};

export default function ApplyStatus({ results, onDismiss }: { results: ApplyResult[]; onDismiss?: () => void }) {
  return (
    <div className="bg-bungie-surface border border-bungie-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold">Loadout</h2>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 text-gray-500 hover:text-gray-300 text-sm leading-none"
          >
            ✕
          </button>
        )}
      </div>
      <div className="space-y-2">
        {results.map((r, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
              r.success ? "bg-green-900/30 border border-green-700/40" : "bg-red-900/30 border border-red-700/40"
            }`}
          >
            <span>{r.success ? "✅" : "❌"}</span>
            <span className="font-medium text-white">{trimBungieName(r.display_name)}</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-300 capitalize">
              {SLOT_LABELS[r.slot] ?? r.slot}
            </span>
            {r.error && (
              <span className="text-red-400 text-xs ml-auto">{r.error}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
