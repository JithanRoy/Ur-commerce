import type {
  DefaultError,
  InvalidateQueryFilters,
  QueryKey,
  UseQueryOptions,
} from "@tanstack/react-query";
import type {
  OrderStatus,
  ProductStatus,
  ReviewStatus,
} from "@urcommerce/api-client";

export type ProductListParams = {
  page: number;
  search: string;
  status: ProductStatus | "";
};

export type ReviewListParams = {
  page: number;
  status: ReviewStatus | "";
  rating: number | null;
};

export type OrderListParams = {
  page: number;
  search: string;
  status: OrderStatus | "";
};

const productsRoot = ["admin", "products"] as const;
const ordersRoot = ["admin", "orders"] as const;
const categoriesRoot = ["admin", "categories"] as const;
const brandsRoot = ["admin", "brands"] as const;
const collectionsRoot = ["admin", "collections"] as const;
const teamRoot = ["admin", "users"] as const;
const settingsRoot = ["admin", "settings"] as const;
const heroRoot = ["admin", "hero"] as const;
const sectionsRoot = ["admin", "sections"] as const;
const profileRoot = ["profile"] as const;
const reviewsRoot = ["admin", "reviews"] as const;

export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  products: {
    all: productsRoot,
    list: (params: ProductListParams) => [...productsRoot, params] as const,
    detail: (productId: string) => [...productsRoot, productId] as const,
    images: (productId: string) =>
      [...productsRoot, productId, "images"] as const,
    collectionCatalogue: () =>
      [...productsRoot, "all-for-collections"] as const,
  },
  orders: {
    all: ordersRoot,
    list: (params: OrderListParams) => [...ordersRoot, params] as const,
    counts: () => [...ordersRoot, "counts"] as const,
    detail: (orderId: string) => [...ordersRoot, orderId] as const,
  },
  categories: {
    all: categoriesRoot,
    list: () => categoriesRoot,
    tree: () => [...categoriesRoot, "tree"] as const,
  },
  brands: {
    all: brandsRoot,
    list: () => brandsRoot,
    options: () => [...brandsRoot, "all"] as const,
  },
  collections: {
    all: collectionsRoot,
    list: () => collectionsRoot,
    detail: (collectionId: string) =>
      [...collectionsRoot, collectionId] as const,
  },
  team: {
    all: teamRoot,
    list: () => teamRoot,
  },
  settings: {
    all: settingsRoot,
    detail: () => settingsRoot,
  },
  hero: {
    all: heroRoot,
    detail: () => heroRoot,
  },
  sections: {
    all: sectionsRoot,
    list: () => sectionsRoot,
  },
  reviews: {
    all: reviewsRoot,
    list: (params: ReviewListParams) => [...reviewsRoot, params] as const,
  },
  profile: {
    all: profileRoot,
    detail: () => profileRoot,
    twoFactor: () => [...profileRoot, "two-factor"] as const,
  },
};

export const mutationKeys = {
  hero: {
    reorder: () => [...heroRoot, "reorder"] as const,
  },
  sections: {
    reorder: () => [...sectionsRoot, "reorder"] as const,
  },
};

export function productQueriesExcept(
  productId: string,
): InvalidateQueryFilters {
  return {
    queryKey: productsRoot,
    predicate: (query) => query.queryKey[2] !== productId,
  };
}

export function orderQueriesExcept(orderId: string): InvalidateQueryFilters {
  return {
    queryKey: ordersRoot,
    predicate: (query) => query.queryKey[2] !== orderId,
  };
}

export type QueryOverrides<
  TQueryFnData,
  TQueryKey extends QueryKey,
  TData = TQueryFnData,
> = Omit<
  UseQueryOptions<TQueryFnData, DefaultError, TData, TQueryKey>,
  "queryKey" | "queryFn"
>;
