"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { formatBDT, isApiError } from "@urcommerce/api-client";
import { checkoutApi } from "@/lib/browser-api";
import { OrderStatusBadge, formatOrderDate } from "./order-status";

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const { data: order, isPending, error } = useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => checkoutApi.order(orderId),
    retry: false,
  });

  if (isPending) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  if (error || !order) {
    const notFound = isApiError(error) && error.isNotFound;
    return (
      <div className="rounded-xl border border-dashed px-8 py-16 text-center">
        <p className="font-medium">
          {notFound ? "Order not found" : "We could not load this order"}
        </p>
        <Link
          href="/account/orders"
          className="mt-6 inline-flex h-11 items-center rounded-full border px-6 text-sm"
        >
          Back to orders
        </Link>
      </div>
    );
  }

  const timeline = [
    { label: "Order placed", at: order.placedAt },
    { label: "Confirmed", at: order.confirmedAt },
    { label: "Shipped", at: order.shippedAt },
    { label: "Delivered", at: order.deliveredAt },
    { label: "Cancelled", at: order.cancelledAt },
  ].filter((entry) => entry.at);

  return (
    <>
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Orders
      </Link>

      <header className="mt-4 mb-8 flex flex-wrap items-center gap-4">
        <h1 className="font-display text-2xl font-semibold">
          {order.orderNumber}
        </h1>
        <OrderStatusBadge status={order.status} />
        <span className="text-sm text-muted-foreground">
          {formatOrderDate(order.placedAt)}
        </span>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 font-medium">Items</h2>
            <ul className="divide-y rounded-xl border">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{item.productName}</p>
                    {item.optionSummary ? (
                      <p className="text-sm text-muted-foreground">
                        {item.optionSummary}
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatBDT(item.unitPrice, order.currency)} ×{" "}
                      {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 font-medium tabular-nums">
                    {formatBDT(item.lineTotal, order.currency)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {timeline.length > 0 ? (
            <section>
              <h2 className="mb-3 font-medium">Progress</h2>
              <ol className="space-y-3">
                {timeline.map((entry) => (
                  <li key={entry.label} className="flex items-baseline gap-3">
                    <span className="size-1.5 shrink-0 rounded-full bg-foreground" />
                    <span className="text-sm">{entry.label}</span>
                    <span className="ml-auto text-sm text-muted-foreground">
                      {formatOrderDate(entry.at as string)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {order.cancelReason ? (
            <p className="text-sm text-muted-foreground">
              Cancelled: {order.cancelReason}
            </p>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border p-5">
            <h2 className="mb-3 font-medium">Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">
                  {formatBDT(order.subtotal, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="tabular-nums">
                  {order.shippingTotal === 0
                    ? "Free"
                    : formatBDT(order.shippingTotal, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between border-t pt-2 font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  {formatBDT(order.grandTotal, order.currency)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              {order.paymentMethod === "CASH_ON_DELIVERY"
                ? "Cash on delivery"
                : order.paymentMethod}
            </p>
          </section>

          <section className="rounded-xl border p-5">
            <h2 className="mb-3 font-medium">Delivering to</h2>
            <address className="space-y-0.5 text-sm not-italic">
              <p className="font-medium">{order.shippingAddress.fullName}</p>
              <p className="text-muted-foreground">
                {order.shippingAddress.addressLine}
              </p>
              <p className="text-muted-foreground">
                {order.shippingAddress.thana}, {order.shippingAddress.district}
              </p>
              <p className="text-muted-foreground">
                {order.shippingAddress.division}
              </p>
              <p className="pt-1">{order.shippingAddress.phone}</p>
            </address>
          </section>
        </aside>
      </div>
    </>
  );
}
