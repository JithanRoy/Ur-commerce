import {
  queryOptions,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { AdminProduct, Paginated } from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { ProductEditRoute } from "@/routes/lazy";

export const productsRootKey = ["admin", "products"] as const;

export function productDetailQuery(productId: string) {
  return queryOptions({
    queryKey: [...productsRootKey, productId],
    queryFn: () => adminApi.products.get(productId),
  });
}

function isProductPage(value: unknown): value is Paginated<AdminProduct> {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    Array.isArray(value.items)
  );
}

export function findProductInLists(
  queryClient: QueryClient,
  productId: string,
): AdminProduct | undefined {
  for (const [, data] of queryClient.getQueriesData({
    queryKey: productsRootKey,
  })) {
    if (!isProductPage(data)) continue;
    const match = data.items.find((product) => product.id === productId);
    if (match) return match;
  }
  return undefined;
}

export function invalidateProductLists(
  queryClient: QueryClient,
  exceptProductId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: productsRootKey,
    predicate: (query) => query.queryKey[2] !== exceptProductId,
  });
}

export function usePrefetchProductDetail() {
  const queryClient = useQueryClient();
  return (productId: string) => {
    void ProductEditRoute.preload();
    void queryClient.prefetchQuery(productDetailQuery(productId));
  };
}
