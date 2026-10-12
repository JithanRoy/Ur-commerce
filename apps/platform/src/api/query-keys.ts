import type { PlatformStoreQuery } from "@urcommerce/api-client";

const storesRoot = ["stores"] as const;

export const queryKeys = {
  stores: {
    all: storesRoot,
    list: (query: PlatformStoreQuery) =>
      [...storesRoot, "list", query] as const,
    detail: (id: string) => [...storesRoot, "detail", id] as const,
    staff: (id: string) => [...storesRoot, "staff", id] as const,
  },
};
