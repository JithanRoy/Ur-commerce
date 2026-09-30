"use client";

import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { formatBDT } from "@urcommerce/api-client";
import { useOrders } from "@/api/orders";
import { OrderStatusBadge, formatOrderDate } from "./order-status";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/page-skeletons";

export function OrdersClient() {
  const { data, isPending, isError } = useOrders();

  if (isPending) {
    return <ListSkeleton label="Loading your orders" />;
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
        <Button asChild shape="pill" className="mt-6 px-6">
          <Link href="/shop">Start shopping</Link>
        </Button>
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
