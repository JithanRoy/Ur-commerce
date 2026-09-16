const STORAGE_KEY = "cart-session";

export function cartSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const token = `guest-${crypto.randomUUID()}`;
    window.localStorage.setItem(STORAGE_KEY, token);
    return token;
  } catch {
    return null;
  }
}

export function clearCartSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable; nothing to clear
  }
}
