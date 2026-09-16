import type { ApiClient } from "./client";
import type { LoginResponse, Role } from "./types";

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
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
      client.post<LoginResponse>("/auth/login", input, {
        withCartSession: true,
      }),
    me: () => client.get<CurrentUser>("/auth/me"),
    logout: () => client.post<void>("/auth/logout"),
  };
}
