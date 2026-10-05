"use client";

import Link from "next/link";
import { ChevronRight, PackageSearch } from "lucide-react";
import { formatBDT } from "@urcommerce/api-client";
import type { Order } from "@urcommerce/api-client";
import { useOrders } from "@/api/orders";
import { OrderStatusBadge, formatOrderDate } from "./order-status";
import { OrderedProductLink } from "./ordered-product-link";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/page-skeletons";
import { OrderLineReview } from "@/features/reviews/order-line-review";
import { ReviewsNudge } from "@/features/reviews/reviews-nudge";

function hasReviewActions(order: Order): boolean {
  return order.items.some(
    (item) =>
      item.review?.state === "AVAILABLE" || item.review?.state === "REVIEWED",
  );
}

function ToReviewBadge({ count }: { count: number }) {
  return (
    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      {count} to review
    </span>
  );
}

function OrderCard({ order }: { order: Order }) {
  const itemCount = order.items.length;
  const toReview = order.reviewableCount ?? 0;

  return (
    <li className="overflow-hidden rounded-xl border transition-colors hover:border-foreground/25">
      <Link href={`/account/orders/${order.id}`} className="group block p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-medium">
              {order.orderNumber}
              {toReview > 0 ? <ToReviewBadge count={toReview} /> : null}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatOrderDate(order.placedAt)} · {itemCount}{" "}
              {itemCount === 1 ? "item" : "items"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <OrderStatusBadge status={order.status} />
            <span className="font-medium tabular-nums">
              {formatBDT(order.grandTotal, order.currency)}
            </span>
            <ChevronRight
              className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </div>
        </div>

        {hasReviewActions(order) ? null : (
          <p className="mt-3 truncate text-sm text-muted-foreground">
            {order.items.map((item) => item.productName).join(", ")}
          </p>
        )}
      </Link>

      {hasReviewActions(order) ? (
        <ul className="divide-y border-t bg-muted/20">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  <OrderedProductLink item={item}>
                    {item.productName}
                  </OrderedProductLink>
                </p>
                {item.optionSummary ? (
                  <p className="text-xs text-muted-foreground">
                    {item.optionSummary}
                  </p>
                ) : null}
              </div>
              <OrderLineReview item={item} />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

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
    <>
      <ReviewsNudge />
      <ul className="space-y-4">
        {data.items.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </ul>
    </>
  );
}
