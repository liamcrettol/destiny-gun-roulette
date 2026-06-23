import { bungieGet } from "./client";

// Standard D2 weapon socket layout:
//   0 = Intrinsic (fixed frame/archetype)
//   1 = Barrel/Sight
//   2 = Magazine/Battery
//   3 = Perk column 1 (first random perk)
//   4 = Perk column 2 (second random perk)
//   5 = Origin trait / adept bonus / enhanced perk
//   6+ = Masterwork, tracker, shader, etc.
const PERK_SOCKET_INDICES = [3, 4, 5];

interface SocketsResponse {
  itemComponents: {
    sockets: {
      data: Record<
        string,
        { sockets: Array<{ plugHash?: number; isEnabled?: boolean; isVisible?: boolean }> }
      >;
    };
  };
}

// Returns Map<instanceId, plugHashes[]> - the active perk plug hashes
// for the main random-roll sockets (indices 3–5) of each requested instance.
export async function getWeaponPerkHashes(
  membershipType: number,
  membershipId: string,
  accessToken: string,
  relevantInstanceIds: Set<string>
): Promise<Map<string, number[]>> {
  if (relevantInstanceIds.size === 0) return new Map();

  // 201+205+102 ensure the API returns sockets for character inventory,
  // character equipment, and vault items respectively.
  const profile = await bungieGet<SocketsResponse>(
    `/Destiny2/${membershipType}/Profile/${membershipId}/?components=201,205,102,305`,
    accessToken
  );

  const socketsData = profile.itemComponents?.sockets?.data ?? {};
  const result = new Map<string, number[]>();

  for (const instanceId of relevantInstanceIds) {
    const entry = socketsData[instanceId];
    if (!entry?.sockets) continue;

    const perks: number[] = [];
    for (const idx of PERK_SOCKET_INDICES) {
      const socket = entry.sockets[idx];
      if (!socket?.plugHash) break;
      // isVisible:false means the socket is effectively empty or unused
      if (socket.isVisible === false) continue;
      perks.push(socket.plugHash);
    }

    if (perks.length > 0) result.set(instanceId, perks);
  }

  return result;
}
