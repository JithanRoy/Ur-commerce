import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@urcommerce/api-client";

type Session = {
  accessToken: string;
  refreshToken: string;
  role: Role;
};

type AuthState = {
  session: Session | null;
  signIn: (session: Session) => void;
  signOut: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      signIn: (session) => set({ session }),
      signOut: () => {
        set({ session: null });
        useAuth.persist.clearStorage();
      },
      setTokens: (accessToken, refreshToken) =>
        set((state) =>
          state.session
            ? { session: { ...state.session, accessToken, refreshToken } }
            : state,
        ),
    }),
    { name: "storefront-auth" },
  ),
);
