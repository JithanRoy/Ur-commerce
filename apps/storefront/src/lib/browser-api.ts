"use client";

import {
  createApiClient,
  createAuthApi,
  createCartApi,
  createCheckoutApi,
  createProfileApi,
  createReviewsApi,
  createStorefrontApi,
} from "@urcommerce/api-client";
import { useAuth } from "@/stores/auth";
import { cartSessionToken } from "@/stores/cart-session";

const client = createApiClient({
  baseUrl: "/api/v1",
  getAccessToken: () => useAuth.getState().session?.accessToken,
  getRefreshToken: () => useAuth.getState().session?.refreshToken,
  getCartSession: () => cartSessionToken(),
  onRefreshed: (accessToken, refreshToken) =>
    useAuth.getState().setTokens(accessToken, refreshToken),
  onUnauthenticated: () => useAuth.getState().signOut(),
});

export const cartApi = createCartApi(client);
export const checkoutApi = createCheckoutApi(client);
export const authApi = createAuthApi(client);
export const shopApi = createStorefrontApi(client);
export const profileApi = createProfileApi(client);
export const reviewsApi = createReviewsApi(client);
