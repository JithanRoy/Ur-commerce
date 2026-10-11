import "server-only";
import { headers } from "next/headers";
import {
  createApiClient,
  createStorefrontApi,
  localStoreHost,
} from "@urcommerce/api-client";

async function shopperTenantHeaders(): Promise<Record<string, string>> {
  const host = (await headers()).get("host");

  if (process.env.NODE_ENV !== "production") {
    const devHost =
      localStoreHost(host) ?? process.env.NEXT_PUBLIC_DEV_TENANT_HOST;
    return devHost ? { "X-Tenant-Host": devHost } : {};
  }

  const internalKey = process.env.INTERNAL_API_KEY;
  if (!host || !internalKey) return {};
  return { "X-Tenant-Host": host, "X-Internal-Key": internalKey };
}

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002/api/v1",
  tenantHeaders: shopperTenantHeaders,
});

export const storefront = createStorefrontApi(api);
