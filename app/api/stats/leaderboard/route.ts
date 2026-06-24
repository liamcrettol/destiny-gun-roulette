import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  // Supabase caps a single select at 1000 rows; page through so the global
  // leaderboard reflects every recorded game, not just the most recent 1000.
  const PAGE = 1000;
  const data: Array<{ user_id: string; display_name: string; kills: number; kd: number; won: boolean | null }> = [];
  for (let from = 0; ; from += PAGE) {
    const { data: page } = await adminSupabase
      .from("player_game_stats")
      .select("user_id, display_name, kills, kd, won")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (!page?.length) break;
    data.push(...page);
    if (page.length < PAGE) break;
  }

  if (!data.length) return NextResponse.json({ entries: [] });

  const byUser = new Map<string, {
    userId: string;
    displayName: string;
    gamesPlayed: number;
    totalKills: number;
    avgKd: number;
    wins: number;
    losses: number;
  }>();

  for (const row of data) {
    const existing = byUser.get(row.user_id);
    if (existing) {
      existing.totalKills += row.kills;
      existing.avgKd =
        (existing.avgKd * existing.gamesPlayed + Number(row.kd)) / (existing.gamesPlayed + 1);
      existing.gamesPlayed += 1;
      if (row.won === true) existing.wins += 1;
      else if (row.won === false) existing.losses += 1;
    } else {
      byUser.set(row.user_id, {
        userId: row.user_id,
        displayName: row.display_name,
        gamesPlayed: 1,
        totalKills: row.kills,
        avgKd: Number(row.kd),
        wins: row.won === true ? 1 : 0,
        losses: row.won === false ? 1 : 0,
      });
    }
  }

  const entries = [...byUser.values()].sort(
    (a, b) => b.totalKills - a.totalKills
  );

  return NextResponse.json({ entries });
}
