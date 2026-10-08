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
import { putToStorage } from "@urcommerce/api-client";
import { reviewsApi } from "@/lib/browser-api";
import { prepareReviewPhoto } from "@/lib/review-photos";
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

export function awaitingReviewsQuery() {
  return queryOptions({
    queryKey: queryKeys.reviews.awaiting(),
    queryFn: () => reviewsApi.awaiting(),
    retry: false,
  });
}

export function useAwaitingReviews(enabled = true) {
  return useQuery({ ...awaitingReviewsQuery(), enabled });
}

export function myReviewsQuery(page = 1) {
  return queryOptions({
    queryKey: queryKeys.reviews.mine(page),
    queryFn: () => reviewsApi.mine({ page, limit: 20 }),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useMyReviews(page = 1) {
  return useQuery(myReviewsQuery(page));
}

export function reviewSummaryQuery() {
  return queryOptions({
    queryKey: queryKeys.reviews.summary(),
    queryFn: () => reviewsApi.summary(),
    retry: false,
  });
}

export function useReviewSummary(enabled = true) {
  return useQuery({ ...reviewSummaryQuery(), enabled });
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

export type UploadedReviewPhoto = { objectKey: string };

async function uploadReviewPhoto(file: File): Promise<UploadedReviewPhoto> {
  const upload = await prepareReviewPhoto(file);
  const ticket = await reviewsApi.imageUpload({
    contentType: upload.type,
    contentLength: upload.size,
  });
  await putToStorage(ticket, upload);
  return { objectKey: ticket.objectKey };
}

export function useUploadReviewPhoto() {
  return useApiMutation({ mutationFn: uploadReviewPhoto });
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
