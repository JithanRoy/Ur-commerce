import "server-only";
import { headers } from "next/headers";
import {
  createApiClient,
  createStorefrontApi,
  localStoreHost,
} from "@urcommerce/api-client";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002/api/v1";

export async function shopperTenantHeaders(): Promise<Record<string, string>> {
  const host = (await headers()).get("host");

  if (process.env.NODE_ENV !== "production") {
    const devHost =
      localStoreHost(host) ?? process.env.NEXT_PUBLIC_DEV_TENANT_HOST;
    return devHost ? { "X-Tenant-Host": devHost } : {};
  }

  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) {
    reportMissingInternalKey();
    return {};
  }
  if (!host) return {};
  return { "X-Tenant-Host": host, "X-Internal-Key": internalKey };
}

let missingKeyReported = false;

function reportMissingInternalKey() {
  if (missingKeyReported) return;
  missingKeyReported = true;
  console.error(
    'INTERNAL_API_KEY is not set, so the API cannot tell which store this is and answers every request with "Store not found for this domain". Set it to the backend\'s value and redeploy.',
  );
}

export const api = createApiClient({
  baseUrl: apiBaseUrl,
  tenantHeaders: shopperTenantHeaders,
});

export const storefront = createStorefrontApi(api);
