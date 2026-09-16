"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";
import { formatBDT } from "@urcommerce/api-client";
import { checkoutApi } from "@/lib/browser-api";
import { OrderStatusBadge, formatOrderDate } from "./order-status";

export function OrdersClient() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: () => checkoutApi.orders({ limit: 20 }),
    retry: false,
  });

  if (isPending) {
    return <p className="text-muted-foreground">Loading your orders…</p>;
  }

  if (isError) {
    return (
      <p role="alert" className="text-destructive">
        We could not load your orders. Please refresh in a moment.
      </p>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-8 py-20 text-center">
        <PackageSearch
          className="mx-auto size-10 text-muted-foreground/40"
          aria-hidden
        />
        <p className="mt-4 font-medium">No orders yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          When you place an order it will appear here.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {data.items.map((order) => (
        <li key={order.id}>
          <Link
            href={`/account/orders/${order.id}`}
            className="block rounded-xl border p-5 transition-colors hover:border-foreground/25"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{order.orderNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {formatOrderDate(order.placedAt)} ·{" "}
                  {order.items.length}{" "}
                  {order.items.length === 1 ? "item" : "items"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <OrderStatusBadge status={order.status} />
                <span className="font-medium tabular-nums">
                  {formatBDT(order.grandTotal, order.currency)}
                </span>
              </div>
            </div>

            <p className="mt-3 truncate text-sm text-muted-foreground">
              {order.items.map((item) => item.productName).join(", ")}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
