const BUNGIE_ROOT = "https://www.bungie.net/Platform";

export async function bungieGet<T>(
  path: string,
  accessToken: string
): Promise<T> {
  const res = await fetch(`${BUNGIE_ROOT}${path}`, {
    headers: {
      "X-API-Key": process.env.BUNGIE_API_KEY!,
      Authorization: `Bearer ${accessToken}`,
    },
    next: { revalidate: 0 }, // always fresh
  });

  if (!res.ok) {
    throw new Error(`Bungie API error ${res.status} on ${path}`);
  }

  const json = await res.json();

  if (json.ErrorCode && json.ErrorCode !== 1) {
    throw new Error(`Bungie error ${json.ErrorCode}: ${json.Message}`);
  }

  return json.Response as T;
}

export async function bungiePost<T>(
  path: string,
  accessToken: string,
  body: unknown
): Promise<T> {
  const res = await fetch(`${BUNGIE_ROOT}${path}`, {
    method: "POST",
    headers: {
      "X-API-Key": process.env.BUNGIE_API_KEY!,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Bungie API error ${res.status} on ${path}`);
  }

  const json = await res.json();

  if (json.ErrorCode && json.ErrorCode !== 1) {
    throw new Error(`Bungie error ${json.ErrorCode}: ${json.Message}`);
  }

  return json.Response as T;
}
