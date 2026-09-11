import { create } from "zustand";
import { persist } from "zustand/middleware";

type CartSessionState = {
  token: string | null;
  ensure: () => string;
  clear: () => void;
};

export const useCartSession = create<CartSessionState>()(
  persist(
    (set, get) => ({
      token: null,
      ensure: () => {
        const existing = get().token;
        if (existing) return existing;
        const token = `guest-${crypto.randomUUID()}`;
        set({ token });
        return token;
      },
      clear: () => set({ token: null }),
    }),
    { name: "cart-session" },
  ),
);
