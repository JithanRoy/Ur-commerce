import {
  createAdminApi,
  createApiClient,
  createAuthApi,
} from "@urcommerce/api-client";
import { useAuth } from "@/stores/auth";

const client = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:3002/api/v1",
  getAccessToken: () => useAuth.getState().session?.accessToken,
  getRefreshToken: () => useAuth.getState().session?.refreshToken,
  devTenantHost: import.meta.env.DEV
    ? import.meta.env.VITE_DEV_TENANT_HOST
    : undefined,
  onRefreshed: (accessToken, refreshToken) =>
    useAuth.getState().setTokens(accessToken, refreshToken),
  onUnauthenticated: () => {
    useAuth.getState().signOut();
  },
});

export const authApi = createAuthApi(client);
export const adminApi = createAdminApi(client);
