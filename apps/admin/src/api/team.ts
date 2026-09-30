import { queryOptions, useQuery } from "@tanstack/react-query";
import type {
  AdminUser,
  CreateStaffInput,
  Paginated,
  StaffRole,
} from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { queryKeys, type QueryOverrides } from "./query-keys";
import { useApiMutation, type ApiMutationOverrides } from "./use-api-mutation";

const TEAM_LIMIT = 100;

export function teamQuery() {
  return queryOptions({
    queryKey: queryKeys.team.list(),
    queryFn: () => adminApi.users.list({ limit: TEAM_LIMIT }),
    retry: false,
  });
}

export function useTeam(
  options?: QueryOverrides<
    Paginated<AdminUser>,
    ReturnType<typeof queryKeys.team.list>
  >,
) {
  return useQuery({ ...teamQuery(), ...options });
}

export function useAddStaff(
  options: ApiMutationOverrides<AdminUser, CreateStaffInput> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: (input: CreateStaffInput) => adminApi.users.create(input),
    invalidate: [queryKeys.team.all],
  });
}

export type StaffAccessInput = { id: string; isActive: boolean };

export function useSetStaffAccess(
  options: ApiMutationOverrides<AdminUser, StaffAccessInput> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: ({ id, isActive }: StaffAccessInput) =>
      adminApi.users.update(id, { isActive }),
    invalidate: [queryKeys.team.all],
  });
}

export type StaffRoleInput = { id: string; role: StaffRole };

export function useSetStaffRole(
  options: ApiMutationOverrides<AdminUser, StaffRoleInput> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: ({ id, role }: StaffRoleInput) =>
      adminApi.users.update(id, { role }),
    invalidate: [queryKeys.team.all],
  });
}
