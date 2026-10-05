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
  UpdateReviewInput,
} from "@urcommerce/api-client";
import { reviewsApi } from "@/lib/browser-api";
import { useAuth } from "@/stores/auth";
import { queryKeys } from "./query-keys";
import {
  useApiMutation,
  type ApiMutationOverrides,
} from "./use-api-mutation";

type UpdateReviewVariables = { id: string; input: UpdateReviewInput };

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

const everyReviewQuery = [queryKeys.reviews.all];

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

export function useUpdateReview(
  options: ApiMutationOverrides<OwnReview, UpdateReviewVariables> = {},
) {
  return useApiMutation({
    invalidate: everyReviewQuery,
    awaitInvalidate: true,
    ...options,
    mutationFn: ({ id, input }: UpdateReviewVariables) =>
      reviewsApi.update(id, input),
  });
}

export function useDeleteReview(
  options: ApiMutationOverrides<{ deleted: true }, string> = {},
) {
  return useApiMutation({
    invalidate: everyReviewQuery,
    awaitInvalidate: true,
    ...options,
    mutationFn: (id: string) => reviewsApi.remove(id),
  });
}
