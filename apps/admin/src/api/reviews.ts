import {
  keepPreviousData,
  queryOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  AdminReview,
  ModerationDecision,
  Paginated,
} from "@urcommerce/api-client";
import { isApiError } from "@urcommerce/api-client";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import { queryKeys, type ReviewListParams } from "./query-keys";
import { useApiMutation, type ApiMutationOverrides } from "./use-api-mutation";

const REVIEW_PAGE_SIZE = 20;

export type ModerateVariables = { id: string; status: ModerationDecision };

type ModerateSnapshot = {
  previous: [readonly unknown[], Paginated<AdminReview> | undefined][];
};

export function reviewListQuery(params: ReviewListParams) {
  return queryOptions({
    queryKey: queryKeys.reviews.list(params),
    queryFn: () =>
      adminApi.reviews.list({
        page: params.page,
        limit: REVIEW_PAGE_SIZE,
        ...(params.status ? { status: params.status } : {}),
        ...(params.rating ? { rating: params.rating } : {}),
      }),
    placeholderData: keepPreviousData,
  });
}

export function useReviews(params: ReviewListParams) {
  return useQuery(reviewListQuery(params));
}

function moderatedMessage(_review: AdminReview, { status }: ModerateVariables) {
  return status === "REJECTED"
    ? "Review hidden. It no longer counts towards the product's stars."
    : "Review restored to the store.";
}

export function useModerateReview(
  options: ApiMutationOverrides<
    AdminReview,
    ModerateVariables,
    ModerateSnapshot
  > = {},
) {
  const queryClient = useQueryClient();
  return useApiMutation<AdminReview, ModerateVariables, ModerateSnapshot>({
    success: moderatedMessage,
    ...options,
    mutationFn: ({ id, status }: ModerateVariables) =>
      adminApi.reviews.moderate(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.reviews.all });
      const previous = queryClient.getQueriesData<Paginated<AdminReview>>({
        queryKey: queryKeys.reviews.all,
      });
      queryClient.setQueriesData<Paginated<AdminReview>>(
        { queryKey: queryKeys.reviews.all },
        (page) =>
          page
            ? {
                ...page,
                items: page.items.map((review) =>
                  review.id === id ? { ...review, status } : review,
                ),
              }
            : page,
      );
      return { previous };
    },
    onError: (cause, _variables, snapshot) => {
      for (const [key, data] of snapshot?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
      toast.error(
        isApiError(cause) ? cause.message : "Could not update that review.",
      );
    },
    invalidate: [queryKeys.reviews.all],
  });
}
