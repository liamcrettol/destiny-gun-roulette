import { adminSupabase } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import WatchView from "./WatchView";
import type { LobbyLoadoutSlot } from "@/types/lobby";

export const dynamic = "force-dynamic";

export default async function WatchPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const { data: lobby } = await adminSupabase
    .from("lobbies")
    .select("id, code, current_round")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!lobby) notFound();

  const { data: round } = await adminSupabase
    .from("lobby_rounds")
    .select("id")
    .eq("lobby_id", lobby.id)
    .eq("round_number", lobby.current_round)
    .maybeSingle();

  let initialSlots: LobbyLoadoutSlot[] = [];
  if (round) {
    const { data: slots } = await adminSupabase
      .from("lobby_loadout_slots")
      .select("*")
      .eq("round_id", round.id);
    initialSlots = slots ?? [];
  }

  return (
    <main className="min-h-screen p-6 w-full max-w-2xl mx-auto">
      <WatchView
        lobbyId={lobby.id}
        code={lobby.code}
        initialRoundNumber={lobby.current_round}
        initialRoundId={round?.id ?? null}
        initialSlots={initialSlots}
      />
    </main>
  );
}
