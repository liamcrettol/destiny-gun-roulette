import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { joinLobby } from "@/lib/lobby";
import { z } from "zod";

const schema = z.object({ code: z.string().min(4).max(10) });

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());
    const { lobby } = await joinLobby(
      body.code,
      session.userId,
      session.displayName,
      session.bungieMembershipType,
      session.bungieMembershipId
    );
    return NextResponse.json({ code: lobby.code, lobbyId: lobby.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : msg === "Lobby not found" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
