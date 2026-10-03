import { queryOptions, useQuery } from "@tanstack/react-query";
import type {
  CurrentUser,
  LoginInput,
  TwoFactorLoginInput,
} from "@urcommerce/api-client";
import { authApi } from "@/lib/api";
import { queryKeys, type QueryOverrides } from "./query-keys";
import { useApiRequest } from "./use-api-mutation";

export function currentUserQuery() {
  return queryOptions({
    queryKey: queryKeys.auth.me(),
    queryFn: () => authApi.me(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  });
}

export function useCurrentUser(
  options?: QueryOverrides<CurrentUser, ReturnType<typeof queryKeys.auth.me>>,
) {
  return useQuery({ ...currentUserQuery(), ...options });
}

export function useLogin() {
  return useApiRequest((input: LoginInput) => authApi.login(input));
}

export function useCompleteTwoFactor() {
  return useApiRequest((input: TwoFactorLoginInput) =>
    authApi.completeTwoFactor(input),
  );
}

export function useLogout() {
  return useApiRequest(() => authApi.logout());
}
