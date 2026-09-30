import { queryOptions, useQuery } from "@tanstack/react-query";
import type {
  StoreSettings,
  UpdateStoreSettingsInput,
} from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { queryKeys, type QueryOverrides } from "./query-keys";
import { useApiMutation, type ApiMutationOverrides } from "./use-api-mutation";

export function storeSettingsQuery() {
  return queryOptions({
    queryKey: queryKeys.settings.detail(),
    queryFn: () => adminApi.settings.get(),
    retry: false,
  });
}

export function useStoreSettings(
  options?: QueryOverrides<
    StoreSettings,
    ReturnType<typeof queryKeys.settings.detail>
  >,
) {
  return useQuery({ ...storeSettingsQuery(), ...options });
}

export function useUpdateStoreSettings(
  options: ApiMutationOverrides<StoreSettings, UpdateStoreSettingsInput> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: (patch: UpdateStoreSettingsInput) =>
      adminApi.settings.update(patch),
    invalidate: [queryKeys.settings.all],
  });
}
