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
import { toast } from "sonner";

export type Invalidation = QueryKey | InvalidateQueryFilters;

type FromResult<T, TData, TVariables> =
  T | ((data: TData, variables: TVariables) => T);

export type ApiMutationOptions<
  TData,
  TVariables = void,
  TOnMutateResult = unknown,
> = UseMutationOptions<TData, DefaultError, TVariables, TOnMutateResult> & {
  success?: FromResult<string, TData, TVariables>;
  error?: string;
  silentError?: boolean;
  invalidate?: FromResult<Invalidation[], TData, TVariables>;
  awaitInvalidate?: boolean;
};

export type ApiMutationOverrides<
  TData,
  TVariables = void,
  TOnMutateResult = unknown,
> = Omit<ApiMutationOptions<TData, TVariables, TOnMutateResult>, "mutationFn">;

const FALLBACK_ERROR = "Something went wrong. Please try again.";

function isQueryKey(entry: Invalidation): entry is QueryKey {
  return Array.isArray(entry);
}

function toFilters(entry: Invalidation): InvalidateQueryFilters {
  return isQueryKey(entry) ? { queryKey: entry } : entry;
}

function successMessageFor<TData, TVariables>(
  success: FromResult<string, TData, TVariables> | undefined,
  data: TData,
  variables: TVariables,
): string | undefined {
  return typeof success === "function" ? success(data, variables) : success;
}

function invalidationsFor<TData, TVariables>(
  invalidate: FromResult<Invalidation[], TData, TVariables> | undefined,
  data: TData,
  variables: TVariables,
): Invalidation[] {
  if (!invalidate) return [];
  return typeof invalidate === "function"
    ? invalidate(data, variables)
    : invalidate;
}

export function useApiMutation<
  TData,
  TVariables = void,
  TOnMutateResult = unknown,
>({
  success,
  error,
  silentError,
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
      invalidationsFor(invalidate, data, variables).map((entry) =>
        queryClient.invalidateQueries(toFilters(entry)),
      ),
    );

  return useMutation({
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      if (awaitInvalidate) await invalidateAfter(data, variables);
      const message = successMessageFor(success, data, variables);
      if (message) toast.success(message);
      const result = onSuccess?.(data, variables, onMutateResult, context);
      if (!awaitInvalidate) void invalidateAfter(data, variables);
      return result;
    },
    onError: (cause, variables, onMutateResult, context) => {
      if (onError) return onError(cause, variables, onMutateResult, context);
      if (silentError) return;
      toast.error(
        isApiError(cause) ? cause.message : (error ?? FALLBACK_ERROR),
      );
    },
  });
}

export function useApiRequest<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
): (variables: TVariables) => Promise<TData> {
  return useApiMutation({
    mutationFn,
    silentError: true,
    networkMode: "always",
  }).mutateAsync;
}
