import type {
  DefaultError,
  QueryKey,
  UseQueryOptions,
} from "@tanstack/react-query";
import type { ProductReviewQuery } from "@urcommerce/api-client";

const cartRoot = ["cart"] as const;
const ordersRoot = ["orders"] as const;
const addressesRoot = ["addresses"] as const;
const checkoutRoot = ["checkout"] as const;
const productsRoot = ["products"] as const;
const profileRoot = ["profile"] as const;
const reviewsRoot = ["reviews"] as const;

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
  reviews: {
    all: reviewsRoot,
    forProduct: (slug: string, query: ProductReviewQuery) =>
      [...reviewsRoot, "product", slug, query] as const,
    productAll: (slug: string) => [...reviewsRoot, "product", slug] as const,
    eligibility: (productId: string) =>
      [...reviewsRoot, "eligibility", productId] as const,
    awaiting: () => [...reviewsRoot, "awaiting"] as const,
    mine: (page: number) => [...reviewsRoot, "mine", page] as const,
    summary: () => [...reviewsRoot, "summary"] as const,
    prompt: () => [...reviewsRoot, "prompt"] as const,
  },
  profile: {
    all: profileRoot,
    detail: () => profileRoot,
    twoFactor: () => [...profileRoot, "two-factor"] as const,
  },
  products: {
    all: productsRoot,
    detail: (slug: string) => [...productsRoot, slug] as const,
    slugForId: (productId: string) =>
      [...productsRoot, "slug-for-id", productId] as const,
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
