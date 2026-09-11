import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "CUSTOMER" | "TENANT_STAFF" | "TENANT_OWNER";

type Session = {
  accessToken: string;
  refreshToken: string;
  role: Role;
};

type AuthState = {
  session: Session | null;
  signIn: (session: Session) => void;
  signOut: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      signIn: (session) => set({ session }),
      signOut: () => set({ session: null }),
    }),
    { name: "auth" },
  ),
);

export const getAccessToken = () => useAuth.getState().session?.accessToken;
