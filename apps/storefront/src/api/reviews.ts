"use client";

import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import type {
  CreateReviewInput,
  OwnReview,
  ProductReviewQuery,
} from "@urcommerce/api-client";
import { reviewsApi } from "@/lib/browser-api";
import { useAuth } from "@/stores/auth";
import { queryKeys } from "./query-keys";
import { useApiMutation, type ApiMutationOverrides } from "./use-api-mutation";

export function productReviewsQuery(slug: string, query: ProductReviewQuery) {
  return queryOptions({
    queryKey: queryKeys.reviews.forProduct(slug, query),
    queryFn: () => reviewsApi.forProduct(slug, query),
    placeholderData: keepPreviousData,
  });
}

export function useProductReviews(slug: string, query: ProductReviewQuery) {
  return useQuery(productReviewsQuery(slug, query));
}

export function useReviewEligibility(productId: string) {
  const signedIn = useAuth((state) => Boolean(state.session));
  return useQuery({
    queryKey: queryKeys.reviews.eligibility(productId),
    queryFn: () => reviewsApi.eligibility(productId),
    enabled: signedIn,
    retry: false,
  });
}

export function useAwaitingReviews(enabled = true) {
  return useQuery({
    queryKey: queryKeys.reviews.awaiting(),
    queryFn: () => reviewsApi.awaiting(),
    enabled,
    retry: false,
  });
}

export function useMyReviews(page = 1) {
  return useQuery({
    queryKey: queryKeys.reviews.mine(page),
    queryFn: () => reviewsApi.mine({ page, limit: 20 }),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useReviewSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.reviews.summary(),
    queryFn: () => reviewsApi.summary(),
    enabled,
    retry: false,
  });
}

export function useReviewPrompt(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.reviews.prompt(),
    queryFn: () => reviewsApi.prompt(),
    enabled,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useMarkPromptShown() {
  return useApiMutation({
    mutationFn: (productId: string) => reviewsApi.promptShown(productId),
  });
}

export function useDismissPrompt() {
  return useApiMutation({
    mutationFn: (productId: string) => reviewsApi.dismissPrompt(productId),
  });
}

const everyReviewQuery = [queryKeys.reviews.all, queryKeys.orders.all];

export function useCreateReview(
  options: ApiMutationOverrides<OwnReview, CreateReviewInput> = {},
) {
  return useApiMutation({
    invalidate: everyReviewQuery,
    awaitInvalidate: true,
    ...options,
    mutationFn: (input: CreateReviewInput) => reviewsApi.create(input),
  });
}
