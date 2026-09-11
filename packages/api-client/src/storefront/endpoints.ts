import type { ApiClient } from "../client";
import type { HomeResponse } from "./types";

export function createStorefrontApi(client: ApiClient) {
  return {
    home: () => client.get<HomeResponse>("/home"),
  };
}

export type StorefrontApi = ReturnType<typeof createStorefrontApi>;
