import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CurrentUser, Role } from "@urcommerce/api-client";
import { claimStorageFor, rememberingStorage } from "./session-storage";

const STORAGE_KEY = "admin-auth";

type Session = {
  accessToken: string;
  refreshToken: string;
  role: Role;
};

export type SignOutNotice = { reason: "password-changed"; email: string };

type AuthState = {
  session: Session | null;
  user: CurrentUser | null;
  signOutNotice: SignOutNotice | null;
  signIn: (session: Session, remember: boolean) => void;
  signOut: (notice?: SignOutNotice) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: CurrentUser | null) => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      signOutNotice: null,
      signIn: (session, remember) => {
        claimStorageFor(STORAGE_KEY, remember);
        set({ session, signOutNotice: null });
      },
      signOut: (notice) => {
        set({ session: null, user: null, signOutNotice: notice ?? null });
        useAuth.persist.clearStorage();
      },
      setTokens: (accessToken, refreshToken) =>
        set((state) =>
          state.session
            ? { session: { ...state.session, accessToken, refreshToken } }
            : state,
        ),
      setUser: (user) => set({ user }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => rememberingStorage(STORAGE_KEY)),
      partialize: (state) => ({ session: state.session }),
    },
  ),
);
