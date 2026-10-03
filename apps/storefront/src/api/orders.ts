"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import type { Order, Paginated } from "@urcommerce/api-client";
import { checkoutApi } from "@/lib/browser-api";
import { isOrderSettled } from "@/features/account/order-progress";
import { queryKeys, type QueryOverrides } from "./query-keys";

const ORDER_PAGE_SIZE = 20;
const ORDER_POLL_MS = 30_000;

export function orderListQuery() {
  return queryOptions({
    queryKey: queryKeys.orders.list(),
    queryFn: () => checkoutApi.orders({ limit: ORDER_PAGE_SIZE }),
    retry: false,
    staleTime: 0,
  });
}

export function orderDetailQuery(orderId: string) {
  return queryOptions({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => checkoutApi.order(orderId),
    retry: false,
    staleTime: 0,
    refetchInterval: (query) =>
      isOrderSettled(query.state.data?.status) ? false : ORDER_POLL_MS,
  });
}

export function useOrders(
  options?: QueryOverrides<
    Paginated<Order>,
    ReturnType<typeof queryKeys.orders.list>
  >,
) {
  return useQuery({ ...orderListQuery(), ...options });
}

export function useOrder(
  orderId: string,
  options?: QueryOverrides<
    Order,
    ReturnType<typeof queryKeys.orders.detail>
  >,
) {
  return useQuery({ ...orderDetailQuery(orderId), ...options });
}
