import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { adminSupabase } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({
  lobbyId: z.string().uuid(),
  characterId: z.string(),
  isReady: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());

    await adminSupabase
      .from("lobby_members")
      .update({
        is_ready: body.isReady,
        selected_character_id: body.characterId,
      })
      .eq("lobby_id", body.lobbyId)
      .eq("user_id", session.userId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
