const BUNGIE_ROOT = "https://www.bungie.net/Platform";

function buildErrorMessage(status: number, path: string, responseBody?: string): string {
  let message = `Bungie API error ${status} on ${path}`;
  if (responseBody) {
    try {
      const json = JSON.parse(responseBody);
      if (json.Message) message += `: ${json.Message}`;
      if (json.ErrorStatus) message += ` (${json.ErrorStatus})`;
    } catch {
      // If body isn't JSON, just use the base message
    }
  }
  return message;
}

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

  const json = await res.json();

  if (!res.ok) {
    const responseBody = JSON.stringify(json);
    throw new Error(buildErrorMessage(res.status, path, responseBody));
  }

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

  const json = await res.json();

  if (!res.ok) {
    const responseBody = JSON.stringify(json);
    throw new Error(buildErrorMessage(res.status, path, responseBody));
  }

  if (json.ErrorCode && json.ErrorCode !== 1) {
    throw new Error(`Bungie error ${json.ErrorCode}: ${json.Message}`);
  }

  return json.Response as T;
}
