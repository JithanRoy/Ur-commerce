import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { expiresAtFrom, readTokenClaims } from "@/lib/session-token";

const STORAGE_KEY = "platform-console-session";

export type Session = {
  accessToken: string;
  email: string;
  expiresAt: number | null;
};

export type SignOutReason = "expired" | "signed-out";

type AuthState = {
  session: Session | null;
  signOutReason: SignOutReason | null;
  signIn: (accessToken: string, fallbackEmail: string) => void;
  signOut: (reason?: SignOutReason) => void;
};

function sessionStore(): Storage {
  return window.sessionStorage;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      signOutReason: null,
      signIn: (accessToken, fallbackEmail) =>
        set({
          signOutReason: null,
          session: {
            accessToken,
            email: readTokenClaims(accessToken).email ?? fallbackEmail,
            expiresAt: expiresAtFrom(accessToken),
          },
        }),
      signOut: (reason = "signed-out") => {
        set({ session: null, signOutReason: reason });
        useAuth.persist.clearStorage();
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(sessionStore),
      partialize: (state) => ({ session: state.session }),
    },
  ),
);

export function isSessionLive(session: Session | null): session is Session {
  return Boolean(
    session && (session.expiresAt === null || session.expiresAt > Date.now()),
  );
}
