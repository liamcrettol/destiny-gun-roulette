"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lobby } from "@/types/lobby";

const STATUS_LABELS: Record<Lobby["status"], string> = {
  waiting: "Waiting for players",
  rolling: "Rolling weapons",
  applying: "Applying loadout",
  in_game: "In game",
  done: "Ended",
};

type RollMode = "normal" | "chaos" | "meta";

interface Props {
  activeSession?: { code: string; status: Lobby["status"] } | null;
}

export default function LobbyControls({ activeSession }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Creation settings
  const [showSettings, setShowSettings] = useState(false);
  const [rollMode, setRollMode] = useState<RollMode>("normal");
  const [rerollLimit, setRerollLimit] = useState<number | null>(null);
  const [noDup, setNoDup] = useState(false);

  async function handleCreate() {
    setLoading("create");
    setError(null);
    try {
      const res = await fetch("/api/lobby/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { mode: rollMode, rerollLimit, noDup } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/lobby/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create lobby");
      setLoading(null);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading("join");
    setError(null);
    try {
      const res = await fetch("/api/lobby/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/lobby/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join lobby");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {activeSession && (
        <div className="bg-bungie-surface border border-bungie-blue/50 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-white font-semibold text-sm">Active session detected</p>
            <p className="text-gray-400 text-xs mt-0.5">
              <span className="font-mono text-bungie-blue slashed-zero">{activeSession.code}</span>
              {" · "}
              {STATUS_LABELS[activeSession.status]}
            </p>
          </div>
          <button
            onClick={() => router.push(`/lobby/${activeSession.code}`)}
            className="shrink-0 bg-bungie-blue hover:opacity-90 text-white font-semibold text-sm px-4 py-2 rounded-lg transition"
          >
            Rejoin
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Create */}
        <div className="bg-bungie-surface border border-bungie-border rounded-xl p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Create Lobby</h2>
            <p className="text-gray-400 text-sm">
              Create a lobby and share the code with your fireteam.
            </p>
          </div>

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="flex items-center justify-between text-xs text-gray-400 hover:text-gray-200 transition select-none"
          >
            <span>Roll Settings</span>
            <span className="text-[10px]">{showSettings ? "▲" : "▼"}</span>
          </button>

          {showSettings && (
            <div className="space-y-4 pt-1 border-t border-bungie-border/40">
              {/* Roll mode */}
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Roll Mode</p>
                <div className="flex gap-2">
                  {(["normal", "chaos", "meta"] as RollMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setRollMode(m)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border capitalize transition ${
                        rollMode === m
                          ? "border-bungie-blue bg-bungie-blue/20 text-white font-semibold"
                          : "border-bungie-border text-gray-400 hover:border-gray-400"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reroll limit */}
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Rerolls / round</p>
                <div className="flex gap-2">
                  {([null, 3, 5, 10] as (number | null)[]).map((v) => (
                    <button
                      key={String(v)}
                      onClick={() => setRerollLimit(v)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition ${
                        rerollLimit === v
                          ? "border-bungie-blue bg-bungie-blue/20 text-white font-semibold"
                          : "border-bungie-border text-gray-400 hover:border-gray-400"
                      }`}
                    >
                      {v === null ? "∞" : v}
                    </button>
                  ))}
                </div>
              </div>

              {/* No duplicates */}
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <button
                  role="switch"
                  aria-checked={noDup}
                  onClick={() => setNoDup((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors duration-200 focus:outline-none ${
                    noDup ? "bg-green-700 border-green-600" : "bg-bungie-dark border-bungie-border group-hover:border-gray-500"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${noDup ? "translate-x-4" : "translate-x-0"}`} />
                </button>
                <span className={`text-xs transition-colors ${noDup ? "text-green-400" : "text-gray-400"}`}>
                  No duplicate weapon types
                </span>
              </label>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading !== null}
            className="w-full bg-bungie-blue hover:opacity-90 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition mt-auto"
          >
            {loading === "create" ? "Creating..." : "Create Lobby"}
          </button>
        </div>

        {/* Join */}
        <div className="bg-bungie-surface border border-bungie-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Join Lobby</h2>
          <p className="text-gray-400 text-sm mb-4">
            Got a code? Enter it here.
          </p>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={8}
              className="flex-1 bg-bungie-dark border border-bungie-border rounded-lg px-3 py-2 text-white font-mono text-center uppercase tracking-widest slashed-zero focus:outline-none focus:border-bungie-blue"
            />
            <button
              type="submit"
              disabled={loading !== null || !code.trim()}
              className="bg-bungie-blue hover:opacity-90 disabled:opacity-50 text-white font-semibold px-4 rounded-lg transition"
            >
              {loading === "join" ? "..." : "Join"}
            </button>
          </form>
        </div>

        {error && (
          <div className="md:col-span-2 text-red-400 text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
