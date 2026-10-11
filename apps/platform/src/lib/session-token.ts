type TokenClaims = { email?: string; exp?: number };

function decodeSegment(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  return atob(padded);
}

export function readTokenClaims(token: string): TokenClaims {
  const payload = token.split(".")[1];
  if (!payload) return {};
  try {
    return JSON.parse(decodeSegment(payload)) as TokenClaims;
  } catch {
    return {};
  }
}

export function expiresAtFrom(token: string): number | null {
  const { exp } = readTokenClaims(token);
  return typeof exp === "number" ? exp * 1000 : null;
}
