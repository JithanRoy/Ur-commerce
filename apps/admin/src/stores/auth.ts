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

type AuthState = {
  session: Session | null;
  user: CurrentUser | null;
  signIn: (session: Session, remember: boolean) => void;
  signOut: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: CurrentUser | null) => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      signIn: (session, remember) => {
        claimStorageFor(STORAGE_KEY, remember);
        set({ session });
      },
      signOut: () => {
        set({ session: null, user: null });
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
