"use client";

import {
  useMutation,
  useQueryClient,
  type DefaultError,
  type InvalidateQueryFilters,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { isApiError } from "@urcommerce/api-client";

export type Invalidation = QueryKey | InvalidateQueryFilters;

type FromResult<T, TData, TVariables> =
  | T
  | ((data: TData, variables: TVariables) => T);

export type ApiMutationOptions<
  TData,
  TVariables = void,
  TOnMutateResult = unknown,
> = UseMutationOptions<TData, DefaultError, TVariables, TOnMutateResult> & {
  success?: FromResult<string, TData, TVariables>;
  error?: string;
  onErrorMessage?: (message: string, cause: DefaultError) => void;
  invalidate?: FromResult<Invalidation[], TData, TVariables>;
  awaitInvalidate?: boolean;
};

export type ApiMutationOverrides<
  TData,
  TVariables = void,
  TOnMutateResult = unknown,
> = Omit<ApiMutationOptions<TData, TVariables, TOnMutateResult>, "mutationFn">;

export const FALLBACK_ERROR = "Something went wrong. Try again.";

export function apiErrorMessage(cause: unknown, fallback = FALLBACK_ERROR) {
  return isApiError(cause) ? cause.message : fallback;
}

function isQueryKey(entry: Invalidation): entry is QueryKey {
  return Array.isArray(entry);
}

function toFilters(entry: Invalidation): InvalidateQueryFilters {
  return isQueryKey(entry) ? { queryKey: entry } : entry;
}

function resolve<T, TData, TVariables>(
  value: FromResult<T, TData, TVariables> | undefined,
  data: TData,
  variables: TVariables,
): T | undefined {
  return typeof value === "function"
    ? (value as (data: TData, variables: TVariables) => T)(data, variables)
    : value;
}

function showSuccessToast(message: string) {
  void import("sonner").then(({ toast }) => toast.success(message));
}

export function useApiMutation<
  TData,
  TVariables = void,
  TOnMutateResult = unknown,
>({
  success,
  error,
  onErrorMessage,
  invalidate,
  awaitInvalidate,
  onSuccess,
  onError,
  ...options
}: ApiMutationOptions<TData, TVariables, TOnMutateResult>): UseMutationResult<
  TData,
  DefaultError,
  TVariables,
  TOnMutateResult
> {
  const queryClient = useQueryClient();

  const invalidateAfter = (data: TData, variables: TVariables) =>
    Promise.all(
      (resolve(invalidate, data, variables) ?? []).map((entry) =>
        queryClient.invalidateQueries(toFilters(entry)),
      ),
    );

  return useMutation({
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      if (awaitInvalidate) await invalidateAfter(data, variables);
      else void invalidateAfter(data, variables);
      const message = resolve(success, data, variables);
      if (message) showSuccessToast(message);
      return onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (cause, variables, onMutateResult, context) => {
      onErrorMessage?.(apiErrorMessage(cause, error), cause);
      return onError?.(cause, variables, onMutateResult, context);
    },
  });
}
