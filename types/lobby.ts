import type { WeaponSlot } from "./bungie";

export interface Lobby {
  id: string;
  code: string;
  host_user_id: string;
  captain_user_id: string;
  status: "waiting" | "rolling" | "applying" | "done";
  current_round: number;
  created_at: string;
}

export interface LobbyMember {
  id: string;
  lobby_id: string;
  user_id: string;
  display_name: string;
  bungie_membership_type: number;
  bungie_membership_id: string;
  selected_character_id: string | null;
  is_ready: boolean;
  is_captain: boolean;
  joined_at: string;
}

export interface LobbyRound {
  id: string;
  lobby_id: string;
  round_number: number;
  status: "pending" | "locked" | "applied";
  created_at: string;
}

export interface LobbyLoadoutSlot {
  id: string;
  round_id: string;
  slot: WeaponSlot;
  item_hash: number; // shared hash — every member equips their own instance
  weapon_name: string;
  weapon_icon: string;
  weapon_type: string;
  damage_type: string;
  locked_by_user_id: string;
  created_at: string;
}

export interface RollHistoryEntry {
  round_number: number;
  slots: LobbyLoadoutSlot[];
  applied_at: string | null;
}

// Realtime payload shapes from Supabase
export type LobbyRealtimeEvent =
  | { event: "member_joined"; member: LobbyMember }
  | { event: "member_ready"; user_id: string; is_ready: boolean }
  | { event: "captain_changed"; new_captain_user_id: string }
  | { event: "slot_updated"; slot: LobbyLoadoutSlot }
  | { event: "round_locked"; round: LobbyRound }
  | { event: "apply_result"; results: ApplyResult[] };

export interface ApplyResult {
  user_id: string;
  display_name: string;
  slot: WeaponSlot;
  item_hash: number;
  success: boolean;
  error?: string;
}
