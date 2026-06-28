"use client";

import { useState } from "react";
import { trimBungieName } from "@/lib/utils";
import type { LobbyMember } from "@/types/lobby";

interface Props {
  member: LobbyMember;
  compact?: boolean;
  variant?: "default" | "sidebar";
}

export default function PlayerCard({ member, compact, variant = "default" }: Props) {
  const [bgFailed, setBgFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);

  const bgUrl =
    !bgFailed && member.emblem_background_path
      ? `https://www.bungie.net${member.emblem_background_path}`
      : null;

  const iconUrl =
    !iconFailed && member.emblem_path
      ? `https://www.bungie.net${member.emblem_path}`
      : null;

  if (variant === "sidebar") {
    return (
      <div
        className={`flex items-center gap-2 px-1 py-1.5 rounded-lg ${
          member.is_captain ? "text-yellow-400" : member.is_spectator ? "text-gray-600 opacity-60" : "text-gray-300"
        }`}
      >
        <div className="relative shrink-0 w-[26px] h-[26px] rounded overflow-hidden border border-white/10">
          {iconUrl ? (
            <img src={iconUrl} alt="" className="w-full h-full object-cover" onError={() => setIconFailed(true)} />
          ) : (
            <div className="w-full h-full bg-bungie-border/30 flex items-center justify-center text-[10px]">
              {member.is_captain ? "👑" : "👤"}
            </div>
          )}
        </div>
        <span className="text-xs font-medium truncate flex-1 min-w-0">
          {member.is_captain && <span className="mr-1">👑</span>}
          {trimBungieName(member.display_name)}
        </span>
        {!member.is_spectator && member.selected_character_id && (
          <span className="text-green-400 text-xs shrink-0">✓</span>
        )}
      </div>
    );
  }

  // Banner-only card: the full emblem (emblem_background_path) IS the card — no
  // separate left icon square (that was a redundant second copy of the emblem).
  // Captain is conveyed by the yellow border, not a crown.
  return (
    <div
      className={`relative flex items-center rounded-lg overflow-hidden border w-full ${compact ? "h-14" : "h-[4.5rem]"}
        ${member.is_captain
          ? "border-yellow-500/60"
          : member.is_spectator
          ? "border-bungie-border opacity-60"
          : "border-bungie-border"
        }`}
    >
      {/* Emblem banner */}
      {bgUrl ? (
        <>
          {/* Hidden img to detect load failure */}
          <img
            src={bgUrl}
            alt=""
            className="hidden"
            onError={() => setBgFailed(true)}
          />
          <div
            className="absolute inset-0 bg-cover bg-left"
            style={{ backgroundImage: `url(${bgUrl})` }}
          />
          {/* Legibility gradient: clearer over the emblem art (left), darker
              behind the name (right). */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-black/40 to-black/85" />
        </>
      ) : (
        <div className="absolute inset-0 bg-bungie-dark" />
      )}

      {/* Name + guardian-selected check, overlaid on the right (darker) side. */}
      <div className="relative ml-auto flex items-center gap-2 px-3 max-w-[68%] min-w-0">
        <div className="flex flex-col min-w-0 text-right">
          <span
            className={`${compact ? "text-sm" : "text-base"} font-bold truncate leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]
              ${member.is_spectator ? "text-gray-300" : "text-white"}`}
          >
            {trimBungieName(member.display_name)}
          </span>
          {member.is_spectator && (
            <span className="text-[10px] text-gray-300 leading-tight drop-shadow">spectating</span>
          )}
        </div>

        {!member.is_spectator && member.selected_character_id && (
          <span className="shrink-0 text-green-400 text-sm drop-shadow" title="Guardian selected">
            ✓
          </span>
        )}
      </div>
    </div>
  );
}
