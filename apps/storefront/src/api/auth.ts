"use client";

import { useQueryClient } from "@tanstack/react-query";
import { isTwoFactorChallenge } from "@urcommerce/api-client";
import type {
  LoginInput,
  LoginResponse,
  LoginResult,
  RegisterInput,
  TwoFactorLoginInput,
} from "@urcommerce/api-client";
import { authApi } from "@/lib/browser-api";
import { useAuth } from "@/stores/auth";
import { clearCartSession } from "@/stores/cart-session";
import { queryKeys } from "./query-keys";
import { useApiMutation, type ApiMutationOverrides } from "./use-api-mutation";

type SignInVariables = LoginInput & { remember: boolean };
type TwoFactorVariables = TwoFactorLoginInput & { remember: boolean };

function useRefetchCartForNewSession() {
  const queryClient = useQueryClient();
  return async () => {
    clearCartSession();
    queryClient.removeQueries({ queryKey: queryKeys.profile.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
  };
}

export function useRegister(
  options: ApiMutationOverrides<
    Awaited<ReturnType<typeof authApi.register>>,
    RegisterInput
  > = {},
) {
  return useApiMutation({
    networkMode: "always",
    ...options,
    mutationFn: (input: RegisterInput) => authApi.register(input),
  });
}

export function useSignIn(
  options: ApiMutationOverrides<LoginResult, SignInVariables> = {},
) {
  const signIn = useAuth((state) => state.signIn);
  const refetchCart = useRefetchCartForNewSession();
  return useApiMutation({
    networkMode: "always",
    ...options,
    mutationFn: ({ email, password }: SignInVariables) =>
      authApi.login({ email, password }),
    onSuccess: async (result, variables, ...rest) => {
      if (!isTwoFactorChallenge(result)) {
        signIn(result, variables.remember);
        await refetchCart();
      }
      return options.onSuccess?.(result, variables, ...rest);
    },
  });
}

export function useCompleteTwoFactor(
  options: ApiMutationOverrides<LoginResponse, TwoFactorVariables> = {},
) {
  const signIn = useAuth((state) => state.signIn);
  const refetchCart = useRefetchCartForNewSession();
  return useApiMutation({
    networkMode: "always",
    ...options,
    mutationFn: ({ challengeToken, code }: TwoFactorVariables) =>
      authApi.completeTwoFactor({ challengeToken, code }),
    onSuccess: async (session, variables, ...rest) => {
      signIn(session, variables.remember);
      await refetchCart();
      return options.onSuccess?.(session, variables, ...rest);
    },
  });
}

export function useSignOut() {
  const signOut = useAuth((state) => state.signOut);
  const refetchCart = useRefetchCartForNewSession();
  const logout = useApiMutation({
    networkMode: "always",
    mutationFn: () => authApi.logout(),
  });
  const logoutAll = useApiMutation({
    networkMode: "always",
    mutationFn: () => authApi.logoutAll(),
  });

  const endLocalSession = async () => {
    signOut();
    await refetchCart();
  };

  return {
    revokeThisDevice: () => logout.mutateAsync().catch(() => null),
    revokeAllDevices: () => logoutAll.mutateAsync().catch(() => null),
    endLocalSession,
  };
}
