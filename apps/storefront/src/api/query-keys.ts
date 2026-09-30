import type {
  DefaultError,
  QueryKey,
  UseQueryOptions,
} from "@tanstack/react-query";

const cartRoot = ["cart"] as const;
const ordersRoot = ["orders"] as const;
const addressesRoot = ["addresses"] as const;
const checkoutRoot = ["checkout"] as const;

export const queryKeys = {
  cart: {
    all: cartRoot,
    detail: () => cartRoot,
  },
  orders: {
    all: ordersRoot,
    list: () => ordersRoot,
    detail: (orderId: string) => [...ordersRoot, orderId] as const,
  },
  addresses: {
    all: addressesRoot,
    list: () => addressesRoot,
  },
  checkout: {
    all: checkoutRoot,
    quote: (addressId: string | null) =>
      [...checkoutRoot, "quote", addressId] as const,
  },
};

export const mutationKeys = {
  cart: {
    all: cartRoot,
    line: (lineId: string) => [...cartRoot, "line", lineId] as const,
  },
};

export type QueryOverrides<
  TQueryFnData,
  TQueryKey extends QueryKey,
  TData = TQueryFnData,
> = Omit<
  UseQueryOptions<TQueryFnData, DefaultError, TData, TQueryKey>,
  "queryKey" | "queryFn"
>;
