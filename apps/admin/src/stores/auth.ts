import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrentUser, Role } from "@urcommerce/api-client";

type Session = {
  accessToken: string;
  refreshToken: string;
  role: Role;
};

type AuthState = {
  session: Session | null;
  user: CurrentUser | null;
  signIn: (session: Session) => void;
  signOut: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: CurrentUser | null) => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      signIn: (session) => set({ session }),
      signOut: () => set({ session: null, user: null }),
      setTokens: (accessToken, refreshToken) =>
        set((state) =>
          state.session
            ? { session: { ...state.session, accessToken, refreshToken } }
            : state,
        ),
      setUser: (user) => set({ user }),
    }),
    {
      name: "admin-auth",
      partialize: (state) => ({ session: state.session }),
    },
  ),
);
