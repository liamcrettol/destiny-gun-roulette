"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Lobby, LobbyLoadoutSlot } from "@/types/lobby";

const SLOT_ORDER = ["kinetic", "energy", "power"] as const;
const SLOT_LABELS: Record<string, string> = { kinetic: "Kinetic", energy: "Energy", power: "Power" };

interface Props {
  lobbyId: string;
  code: string;
  initialRoundNumber: number;
  initialRoundId: string | null;
  initialSlots: LobbyLoadoutSlot[];
}

export default function WatchView({ lobbyId, code, initialRoundNumber, initialRoundId, initialSlots }: Props) {
  const supabase = createClient();
  const [roundNumber, setRoundNumber] = useState(initialRoundNumber);
  const [slots, setSlots] = useState<LobbyLoadoutSlot[]>(initialSlots);
  const roundIdRef = useRef<string | null>(initialRoundId);

  useEffect(() => {
    async function loadRound(roundNum: number) {
      const { data: round } = await supabase
        .from("lobby_rounds")
        .select("id")
        .eq("lobby_id", lobbyId)
        .eq("round_number", roundNum)
        .maybeSingle();
      roundIdRef.current = round?.id ?? null;
      if (round) {
        const { data } = await supabase.from("lobby_loadout_slots").select("*").eq("round_id", round.id);
        setSlots(data ?? []);
      } else {
        setSlots([]);
      }
    }

    const channel = supabase
      .channel(`watch:${lobbyId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lobbies", filter: `id=eq.${lobbyId}` },
        (payload) => {
          const next = payload.new as Lobby;
          setRoundNumber(next.current_round);
          loadRound(next.current_round);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lobby_loadout_slots" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const s = payload.new as LobbyLoadoutSlot;
            if (roundIdRef.current && s.round_id !== roundIdRef.current) return;
            setSlots((prev) => [...prev.filter((x) => x.slot !== s.slot), s]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [lobbyId, supabase]);

  const ordered = SLOT_ORDER.map((s) => slots.find((x) => x.slot === s));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Gun Roulette</h1>
          <p className="text-gray-400 text-sm">
            Watching <span className="font-mono text-bungie-blue font-bold">{code}</span> · Round {roundNumber}
          </p>
        </div>
        <span className="text-xs text-green-500 animate-pulse">● live</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {SLOT_ORDER.map((slotName, i) => {
          const slot = ordered[i];
          const isWildcard = slot?.item_hash === 0;
          return (
            <div key={slotName} className="flex flex-col items-center gap-2 rounded-xl p-4 border border-bungie-border bg-bungie-surface">
              <span className="text-xs text-gray-400 uppercase tracking-wider">{SLOT_LABELS[slotName]}</span>
              {isWildcard ? (
                <>
                  <div className="w-16 h-16 rounded bg-gray-800/50 border border-gray-700/50 flex items-center justify-center text-2xl opacity-50 grayscale">👤</div>
                  <p className="text-gray-400 text-xs font-semibold">Your Own</p>
                </>
              ) : slot ? (
                <>
                  <div className="relative w-16 h-16">
                    <Image src={slot.weapon_icon} alt={slot.weapon_name} fill className="object-cover rounded" unoptimized />
                  </div>
                  <div className="text-center">
                    <p className="text-white text-sm font-semibold leading-tight">{slot.weapon_name}</p>
                    <p className="text-gray-400 text-xs">{slot.weapon_type}</p>
                    <p className="text-gray-500 text-xs">{slot.damage_type}</p>
                  </div>
                </>
              ) : (
                <div className="w-16 h-16 rounded bg-gray-800 flex items-center justify-center text-gray-600 text-xl">?</div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-gray-600 text-xs mt-6">Updates live as the captain rolls.</p>
    </div>
  );
}
