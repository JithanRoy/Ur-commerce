"use client";

import {
  createApiClient,
  createAuthApi,
  createCartApi,
  createCheckoutApi,
  createStorefrontApi,
} from "@urcommerce/api-client";
import { useAuth } from "@/stores/auth";
import { cartSessionToken } from "@/stores/cart-session";

const client = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002/api/v1",
  getAccessToken: () => useAuth.getState().session?.accessToken,
  getRefreshToken: () => useAuth.getState().session?.refreshToken,
  getCartSession: () => cartSessionToken(),
  devTenantHost:
    process.env.NODE_ENV !== "production"
      ? process.env.NEXT_PUBLIC_DEV_TENANT_HOST
      : undefined,
  onRefreshed: (accessToken, refreshToken) =>
    useAuth.getState().setTokens(accessToken, refreshToken),
  onUnauthenticated: () => useAuth.getState().signOut(),
});

export const cartApi = createCartApi(client);
export const checkoutApi = createCheckoutApi(client);
export const authApi = createAuthApi(client);
export const shopApi = createStorefrontApi(client);
