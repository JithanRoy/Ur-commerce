import {
  queryOptions,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type {
  AdminOrder,
  AdminOrderListItem,
  ChangeOrderStatusInput,
  OrderCounts,
  Paginated,
} from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { OrderDetailRoute } from "@/routes/lazy";
import {
  orderQueriesExcept,
  queryKeys,
  type OrderListParams,
  type QueryOverrides,
} from "./query-keys";
import { useApiMutation, type ApiMutationOverrides } from "./use-api-mutation";

const ORDER_PAGE_SIZE = 20;

export function orderListQuery(params: OrderListParams) {
  return queryOptions({
    queryKey: queryKeys.orders.list(params),
    queryFn: () =>
      adminApi.orders.list({
        page: params.page,
        limit: ORDER_PAGE_SIZE,
        ...(params.status ? { status: params.status } : {}),
        ...(params.search ? { search: params.search } : {}),
      }),
  });
}

export function orderCountsQuery() {
  return queryOptions({
    queryKey: queryKeys.orders.counts(),
    queryFn: () => adminApi.orders.counts(),
  });
}

export function orderDetailQuery(orderId: string) {
  return queryOptions({
    queryKey: queryKeys.orders.detail(orderId),
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
    queryKey: queryKeys.orders.all,
  })) {
    if (!isOrderPage(data)) continue;
    const match = data.items.find((order) => order.id === orderId);
    if (match) return match;
  }
  return undefined;
}

export function useOrders(
  params: OrderListParams,
  options?: QueryOverrides<
    Paginated<AdminOrderListItem>,
    ReturnType<typeof queryKeys.orders.list>
  >,
) {
  return useQuery({ ...orderListQuery(params), ...options });
}

export function useOrderCounts(
  options?: QueryOverrides<
    OrderCounts,
    ReturnType<typeof queryKeys.orders.counts>
  >,
) {
  return useQuery({ ...orderCountsQuery(), ...options });
}

export function useOrder(
  orderId: string,
  options?: QueryOverrides<
    AdminOrder,
    ReturnType<typeof queryKeys.orders.detail>
  >,
) {
  return useQuery({
    ...orderDetailQuery(orderId),
    enabled: Boolean(orderId),
    ...options,
  });
}

export function useListedOrder(orderId: string) {
  const queryClient = useQueryClient();
  return findOrderInLists(queryClient, orderId);
}

export function usePrefetchOrderDetail() {
  const queryClient = useQueryClient();
  return (orderId: string) => {
    void OrderDetailRoute.preload();
    void queryClient.prefetchQuery(orderDetailQuery(orderId));
  };
}

export function useUpdateOrderStatus(
  orderId: string,
  options: ApiMutationOverrides<AdminOrder, ChangeOrderStatusInput> = {},
) {
  const queryClient = useQueryClient();
  return useApiMutation({
    ...options,
    mutationFn: (input: ChangeOrderStatusInput) =>
      adminApi.orders.changeStatus(orderId, input),
    invalidate: [orderQueriesExcept(orderId)],
    onSuccess: (updated, ...rest) => {
      queryClient.setQueryData(orderDetailQuery(orderId).queryKey, updated);
      return options.onSuccess?.(updated, ...rest);
    },
  });
}
