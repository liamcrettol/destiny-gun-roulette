import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { createLobby } from "@/lib/lobby";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const { lobby } = await createLobby(
      session.userId,
      session.displayName,
      session.bungieMembershipType,
      session.bungieMembershipId,
      body.settings ?? null
    );
    return NextResponse.json({ code: lobby.code, lobbyId: lobby.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
