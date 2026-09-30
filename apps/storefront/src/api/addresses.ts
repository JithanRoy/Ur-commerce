"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import type {
  Address,
  CreateAddressInput,
  DeletedAddress,
  UpdateAddressInput,
} from "@urcommerce/api-client";
import { checkoutApi } from "@/lib/browser-api";
import { queryKeys, type QueryOverrides } from "./query-keys";
import {
  useApiMutation,
  type ApiMutationOverrides,
} from "./use-api-mutation";

type UpdateAddressVariables = { id: string; input: UpdateAddressInput };

const addressInvalidation = [queryKeys.addresses.all];

export function addressListQuery() {
  return queryOptions({
    queryKey: queryKeys.addresses.list(),
    queryFn: () => checkoutApi.addresses.list(),
    retry: false,
  });
}

export function useAddresses(
  options?: QueryOverrides<
    Address[],
    ReturnType<typeof queryKeys.addresses.list>
  >,
) {
  return useQuery({ ...addressListQuery(), ...options });
}

export function useCreateAddress(
  options: ApiMutationOverrides<Address, CreateAddressInput> = {},
) {
  return useApiMutation({
    invalidate: addressInvalidation,
    ...options,
    mutationFn: (input: CreateAddressInput) =>
      checkoutApi.addresses.create(input),
  });
}

export function useUpdateAddress(
  options: ApiMutationOverrides<Address, UpdateAddressVariables> = {},
) {
  return useApiMutation({
    invalidate: addressInvalidation,
    ...options,
    mutationFn: ({ id, input }: UpdateAddressVariables) =>
      checkoutApi.addresses.update(id, input),
  });
}

export function useRemoveAddress(
  options: ApiMutationOverrides<DeletedAddress, string> = {},
) {
  return useApiMutation({
    invalidate: addressInvalidation,
    ...options,
    mutationFn: (id: string) => checkoutApi.addresses.remove(id),
  });
}

export function useSetDefaultAddress(
  options: ApiMutationOverrides<Address, string> = {},
) {
  return useApiMutation({
    invalidate: addressInvalidation,
    ...options,
    mutationFn: (id: string) => checkoutApi.addresses.setDefault(id),
  });
}
