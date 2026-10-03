import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChangePasswordInput,
  ChangePasswordResult,
  Profile,
  RecoveryCodes,
  TwoFactorConfirmation,
  TwoFactorEnrolment,
  TwoFactorStatus,
  UpdateProfileInput,
} from "@urcommerce/api-client";
import { profileApi } from "@/lib/api";
import { queryKeys, type QueryOverrides } from "./query-keys";
import { useApiMutation, type ApiMutationOverrides } from "./use-api-mutation";

export function profileQuery() {
  return queryOptions({
    queryKey: queryKeys.profile.detail(),
    queryFn: () => profileApi.get(),
    retry: false,
  });
}

export function useProfile(
  options?: QueryOverrides<
    Profile,
    ReturnType<typeof queryKeys.profile.detail>
  >,
) {
  return useQuery({ ...profileQuery(), ...options });
}

export function useUpdateProfile(
  options: ApiMutationOverrides<Profile, UpdateProfileInput> = {},
) {
  const queryClient = useQueryClient();
  return useApiMutation({
    success: "Your details are saved.",
    silentError: true,
    ...options,
    mutationFn: (input: UpdateProfileInput) => profileApi.update(input),
    onSuccess: (profile, ...rest) => {
      queryClient.setQueryData(queryKeys.profile.detail(), profile);
      return options.onSuccess?.(profile, ...rest);
    },
    invalidate: [queryKeys.auth.me()],
  });
}

export function useChangePassword(
  options: ApiMutationOverrides<ChangePasswordResult, ChangePasswordInput> = {},
) {
  return useApiMutation({
    success: "Password changed. Sign in again with your new password.",
    silentError: true,
    networkMode: "always",
    ...options,
    mutationFn: (input: ChangePasswordInput) =>
      profileApi.changePassword(input),
  });
}

export function twoFactorQuery() {
  return queryOptions({
    queryKey: queryKeys.profile.twoFactor(),
    queryFn: () => profileApi.twoFactor.status(),
    retry: false,
  });
}

export function useTwoFactorStatus(
  options?: QueryOverrides<
    TwoFactorStatus,
    ReturnType<typeof queryKeys.profile.twoFactor>
  >,
) {
  return useQuery({ ...twoFactorQuery(), ...options });
}

const twoFactorInvalidation = [queryKeys.profile.twoFactor()];

export function useEnrolTwoFactor(
  options: ApiMutationOverrides<TwoFactorEnrolment, void> = {},
) {
  return useApiMutation({
    silentError: true,
    ...options,
    mutationFn: () => profileApi.twoFactor.enrol(),
  });
}

export function useConfirmTwoFactor(
  options: ApiMutationOverrides<TwoFactorConfirmation, string> = {},
) {
  return useApiMutation({
    success: "Two-step verification is on.",
    silentError: true,
    invalidate: twoFactorInvalidation,
    ...options,
    mutationFn: (code: string) => profileApi.twoFactor.confirm(code),
  });
}

export function useDisableTwoFactor(
  options: ApiMutationOverrides<{ enabled: false }, string> = {},
) {
  return useApiMutation({
    success: "Two-step verification is off.",
    silentError: true,
    invalidate: twoFactorInvalidation,
    ...options,
    mutationFn: (code: string) => profileApi.twoFactor.disable(code),
  });
}

export function useRegenerateRecoveryCodes(
  options: ApiMutationOverrides<RecoveryCodes, string> = {},
) {
  return useApiMutation({
    success: "New recovery codes are ready.",
    silentError: true,
    invalidate: twoFactorInvalidation,
    ...options,
    mutationFn: (code: string) =>
      profileApi.twoFactor.regenerateRecoveryCodes(code),
  });
}
