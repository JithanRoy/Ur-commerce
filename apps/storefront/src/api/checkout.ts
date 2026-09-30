"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { isApiError } from "@urcommerce/api-client";
import type {
  CheckoutQuote,
  Order,
  PaymentMethod,
} from "@urcommerce/api-client";
import { checkoutApi } from "@/lib/browser-api";
import { useInvalidateCart } from "./cart";
import { queryKeys, type QueryOverrides } from "./query-keys";
import {
  useApiMutation,
  type ApiMutationOverrides,
} from "./use-api-mutation";

type PlaceOrderVariables = {
  addressId: string;
  paymentMethod: PaymentMethod;
};

export function checkoutQuoteQuery(addressId: string | null) {
  return queryOptions({
    queryKey: queryKeys.checkout.quote(addressId),
    queryFn: () => checkoutApi.quote(addressId as string),
    enabled: Boolean(addressId),
    retry: false,
  });
}

export function useCheckoutQuote(
  addressId: string | null,
  options?: QueryOverrides<
    CheckoutQuote,
    ReturnType<typeof queryKeys.checkout.quote>
  >,
) {
  return useQuery({ ...checkoutQuoteQuery(addressId), ...options });
}

export function usePlaceOrder(
  options: ApiMutationOverrides<Order, PlaceOrderVariables> = {},
) {
  const invalidateCart = useInvalidateCart();
  return useApiMutation({
    invalidate: [queryKeys.cart.all],
    ...options,
    mutationFn: ({ addressId, paymentMethod }: PlaceOrderVariables) =>
      checkoutApi.place(addressId, paymentMethod),
    onError: (cause, ...rest) => {
      const result = options.onError?.(cause, ...rest);
      if (isApiError(cause) && cause.isConflict) void invalidateCart();
      return result;
    },
  });
}
