import { createApiClient, createPlatformApi } from "@urcommerce/api-client";
import { useAuth } from "@/stores/auth";

const client = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:3002/api/v1",
  getAccessToken: () => useAuth.getState().session?.accessToken,
  getRefreshToken: () => undefined,
  onUnauthenticated: () => {
    if (useAuth.getState().session) useAuth.getState().signOut("expired");
  },
});

export const platformApi = createPlatformApi(client);
