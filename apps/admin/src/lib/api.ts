import {
  createAdminApi,
  createApiClient,
  createAuthApi,
} from "@urcommerce/api-client";
import { useAuth } from "@/stores/auth";

const client = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:3002/api/v1",
  getAccessToken: () => useAuth.getState().session?.accessToken,
  devTenantHost: import.meta.env.DEV
    ? import.meta.env.VITE_DEV_TENANT_HOST
    : undefined,
  onUnauthenticated: () => {
    useAuth.getState().signOut();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  },
});

export const authApi = createAuthApi(client);
export const adminApi = createAdminApi(client);
