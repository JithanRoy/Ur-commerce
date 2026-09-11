import { createApiClient } from "@urcommerce/api-client";

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002/api/v1",
  devTenantHost:
    process.env.NODE_ENV !== "production"
      ? process.env.NEXT_PUBLIC_DEV_TENANT_HOST
      : undefined,
});
