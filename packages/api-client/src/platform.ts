import type { ApiClient } from "./client";
import type { Paginated } from "./types";

export const STORE_STATUSES = [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "CANCELLED",
] as const;

export type StoreStatus = (typeof STORE_STATUSES)[number];

export const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  TRIAL: "Trial",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
};

export const STORE_STATUS_TRANSITIONS: Record<StoreStatus, StoreStatus[]> = {
  TRIAL: ["ACTIVE", "SUSPENDED", "CANCELLED"],
  ACTIVE: ["PAST_DUE", "SUSPENDED", "CANCELLED"],
  PAST_DUE: ["ACTIVE", "SUSPENDED", "CANCELLED"],
  SUSPENDED: ["ACTIVE", "CANCELLED"],
  CANCELLED: [],
};

export const SUBDOMAIN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SUBDOMAIN_MIN_LENGTH = 3;
export const SUBDOMAIN_MAX_LENGTH = 63;
export const STORE_OWNER_PASSWORD_MIN_LENGTH = 8;

export const RESERVED_SUBDOMAINS = [
  "admin",
  "api",
  "app",
  "assets",
  "billing",
  "cdn",
  "dashboard",
  "docs",
  "mail",
  "platform",
  "static",
  "status",
  "support",
  "www",
] as const;

export type PlatformStore = {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  status: StoreStatus;
  currency: string;
  locale: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export type PlatformStoreQuery = {
  page?: number;
  limit?: number;
  status?: StoreStatus;
  search?: string;
};

export type CreateStoreInput = {
  name: string;
  subdomain: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  status?: Extract<StoreStatus, "TRIAL" | "ACTIVE">;
};

export type PlatformSession = {
  accessToken: string;
  refreshToken: string;
  role: "PLATFORM_OWNER";
};

export function createPlatformApi(client: ApiClient) {
  return {
    login: (input: { email: string; password: string }) =>
      client.post<PlatformSession>("/platform/auth/login", input, {
        rejectsCredentials: true,
      }),
    stores: {
      list: (query: PlatformStoreQuery = {}) =>
        client.get<Paginated<PlatformStore>>("/platform/tenants", { query }),
      get: (id: string) => client.get<PlatformStore>(`/platform/tenants/${id}`),
      create: (input: CreateStoreInput) =>
        client.post<PlatformStore>("/platform/tenants", input),
      changeStatus: (id: string, status: StoreStatus) =>
        client.patch<PlatformStore>(`/platform/tenants/${id}/status`, {
          status,
        }),
    },
  };
}

export type PlatformApi = ReturnType<typeof createPlatformApi>;
