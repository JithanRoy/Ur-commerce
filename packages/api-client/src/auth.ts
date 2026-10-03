import type { ApiClient } from "./client";
import type { LoginResponse, LoginResult, Role } from "./types";

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type TwoFactorLoginInput = {
  challengeToken: string;
  code: string;
};

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string;
  createdAt: string;
};

export function createAuthApi(client: ApiClient) {
  return {
    register: (input: RegisterInput) =>
      client.post<{ id: string; name: string; email: string }>(
        "/auth/register",
        input,
      ),
    login: (input: LoginInput) =>
      client.post<LoginResult>("/auth/login", input, {
        withCartSession: true,
      }),
    completeTwoFactor: (input: TwoFactorLoginInput) =>
      client.post<LoginResponse>("/auth/two-factor", input, {
        withCartSession: true,
        rejectsCredentials: true,
      }),
    me: () => client.get<CurrentUser>("/auth/me"),
    logout: () =>
      client.post<{ loggedOut: boolean }>("/auth/logout", {
        refreshToken: client.currentRefreshToken(),
      }),
    logoutAll: () =>
      client.post<{ revokedSessions: number }>("/auth/logout-all"),
  };
}
