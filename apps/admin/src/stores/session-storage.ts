import type { StateStorage } from "zustand/middleware";

export function rememberingStorage(key: string): StateStorage {
  const stores = (): Storage[] => {
    if (typeof window === "undefined") return [];
    try {
      return [window.localStorage, window.sessionStorage];
    } catch {
      return [];
    }
  };

  const holder = (): Storage | null =>
    stores().find((store) => store.getItem(key) !== null) ?? null;

  return {
    getItem: (name) => {
      try {
        return holder()?.getItem(name) ?? null;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        const target = holder() ?? window.localStorage;
        target.setItem(name, value);
      } catch {
        // storage unavailable; the session lives in memory for this tab
      }
    },
    removeItem: (name) => {
      for (const store of stores()) {
        try {
          store.removeItem(name);
        } catch {
          // nothing to clear here
        }
      }
    },
  };
}

export function claimStorageFor(key: string, remember: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
    const target = remember ? window.localStorage : window.sessionStorage;
    target.setItem(key, "{}");
  } catch {
    // storage unavailable; nothing to claim
  }
}
