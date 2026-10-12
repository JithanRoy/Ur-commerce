import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { STORE_STATUS_LABELS } from "@urcommerce/api-client";
import type {
  CreateStoreInput,
  PlatformStore,
  PlatformStoreQuery,
  StoreStatus,
  UpdateStoreInput,
} from "@urcommerce/api-client";
import { platformApi } from "@/lib/api";
import { queryKeys } from "./query-keys";
import { useApiMutation, type ApiMutationOverrides } from "./use-api-mutation";

export function useStores(query: PlatformStoreQuery) {
  return useQuery({
    queryKey: queryKeys.stores.list(query),
    queryFn: () => platformApi.stores.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useStore(id: string) {
  return useQuery({
    queryKey: queryKeys.stores.detail(id),
    queryFn: () => platformApi.stores.get(id),
  });
}

export function useCreateStore(
  options: ApiMutationOverrides<PlatformStore, CreateStoreInput> = {},
) {
  return useApiMutation({
    invalidate: [queryKeys.stores.all],
    success: (store) => `${store.name} is ready.`,
    ...options,
    mutationFn: (input: CreateStoreInput) => platformApi.stores.create(input),
  });
}

export function useChangeStoreStatus(id: string) {
  return useApiMutation({
    invalidate: [queryKeys.stores.all],
    awaitInvalidate: true,
    success: (store) =>
      `${store.name} is now ${STORE_STATUS_LABELS[store.status].toLowerCase()}.`,
    mutationFn: (status: StoreStatus) =>
      platformApi.stores.changeStatus(id, status),
  });
}

export function useUpdateStore(id: string) {
  return useApiMutation({
    invalidate: [queryKeys.stores.all],
    awaitInvalidate: true,
    success: "Store details saved.",
    mutationFn: (input: UpdateStoreInput) =>
      platformApi.stores.update(id, input),
  });
}

export function useStoreStaff(id: string) {
  return useQuery({
    queryKey: queryKeys.stores.staff(id),
    queryFn: () => platformApi.stores.staff(id),
  });
}

export function useResetStaffPassword(storeId: string) {
  return useApiMutation({
    invalidate: [queryKeys.stores.staff(storeId)],
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      platformApi.stores.resetPassword(storeId, userId, password),
  });
}

export function useLogin() {
  return useApiMutation({
    silentError: true,
    mutationFn: (input: { email: string; password: string }) =>
      platformApi.login(input),
  });
}
