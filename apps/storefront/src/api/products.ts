"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProductDetail } from "@urcommerce/api-client";
import { shopApi } from "@/lib/browser-api";
import { queryKeys, type QueryOverrides } from "./query-keys";

const PRODUCT_DETAIL_STALE_MS = 60_000;

export function productDetailQuery(slug: string) {
  return queryOptions({
    queryKey: queryKeys.products.detail(slug),
    queryFn: () => shopApi.product(slug),
    staleTime: PRODUCT_DETAIL_STALE_MS,
  });
}

export function useProductDetail(
  slug: string,
  options?: QueryOverrides<
    ProductDetail,
    ReturnType<typeof queryKeys.products.detail>
  >,
) {
  return useQuery({ ...productDetailQuery(slug), ...options });
}

export function usePrefetchProductDetail() {
  const queryClient = useQueryClient();
  return (slug: string) =>
    void queryClient.prefetchQuery(productDetailQuery(slug));
}

const ORDERED_PRODUCT_SEARCH_LIMIT = 24;

function orderedProductSlugQuery(productId: string, productName: string) {
  return queryOptions({
    queryKey: queryKeys.products.slugForId(productId),
    queryFn: async () => {
      const results = await shopApi.products({
        search: productName,
        limit: ORDERED_PRODUCT_SEARCH_LIMIT,
      });
      return (
        results.items.find((product) => product.id === productId)?.slug ?? null
      );
    },
    staleTime: Infinity,
  });
}

export function useResolveOrderedProduct() {
  const queryClient = useQueryClient();
  return {
    prefetch: (productId: string, productName: string) =>
      void queryClient.prefetchQuery(
        orderedProductSlugQuery(productId, productName),
      ),
    resolve: (productId: string, productName: string) =>
      queryClient.fetchQuery(orderedProductSlugQuery(productId, productName)),
  };
}
