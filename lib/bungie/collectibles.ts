import { bungieGet } from "./client";

// Collectible state bitmask - bit 0 = NotAcquired
const NOT_ACQUIRED = 1;

interface CollectiblesResponse {
  profileCollectibles: {
    data: {
      collectibles: Record<string, { state: number }>;
    };
  };
}

// Returns the set of collectible hashes the player has acquired.
// Uses component 800 (Collectibles) with component 200 (Profiles) to ensure
// profile-scoped collectibles are returned.
export async function getAcquiredCollectibles(
  membershipType: number,
  membershipId: string,
  accessToken: string
): Promise<Set<number>> {
  const profile = await bungieGet<CollectiblesResponse>(
    `/Destiny2/${membershipType}/Profile/${membershipId}/?components=200,800`,
    accessToken
  );

  const collectibles = profile.profileCollectibles?.data?.collectibles ?? {};
  const acquired = new Set<number>();

  for (const [hashStr, entry] of Object.entries(collectibles)) {
    if ((entry.state & NOT_ACQUIRED) === 0) {
      acquired.add(Number(hashStr));
    }
  }

  return acquired;
}
