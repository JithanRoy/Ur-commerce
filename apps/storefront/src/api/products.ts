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
