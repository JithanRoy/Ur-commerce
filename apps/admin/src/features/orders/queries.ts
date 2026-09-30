import {
  queryOptions,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { AdminOrderListItem, Paginated } from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { OrderDetailRoute } from "@/routes/lazy";

export const ordersRootKey = ["admin", "orders"] as const;

export function orderDetailQuery(orderId: string) {
  return queryOptions({
    queryKey: [...ordersRootKey, orderId],
    queryFn: () => adminApi.orders.get(orderId),
  });
}

function isOrderPage(value: unknown): value is Paginated<AdminOrderListItem> {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    Array.isArray(value.items)
  );
}

export function findOrderInLists(
  queryClient: QueryClient,
  orderId: string,
): AdminOrderListItem | undefined {
  for (const [, data] of queryClient.getQueriesData({
    queryKey: ordersRootKey,
  })) {
    if (!isOrderPage(data)) continue;
    const match = data.items.find((order) => order.id === orderId);
    if (match) return match;
  }
  return undefined;
}

export function invalidateOrderLists(
  queryClient: QueryClient,
  exceptOrderId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: ordersRootKey,
    predicate: (query) => query.queryKey[2] !== exceptOrderId,
  });
}

export function usePrefetchOrderDetail() {
  const queryClient = useQueryClient();
  return (orderId: string) => {
    void OrderDetailRoute.preload();
    void queryClient.prefetchQuery(orderDetailQuery(orderId));
  };
}
