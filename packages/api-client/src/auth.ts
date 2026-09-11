import type { ApiClient } from "./client";
import type { LoginResponse } from "./types";

export type LoginInput = {
  email: string;
  password: string;
};

export function createAuthApi(client: ApiClient) {
  return {
    login: (input: LoginInput) =>
      client.post<LoginResponse>("/auth/login", input, {
        withCartSession: true,
      }),
  };
}
