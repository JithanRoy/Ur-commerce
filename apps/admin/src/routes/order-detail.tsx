import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { formatBDT } from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/features/orders/status-badge";
import { StatusActions } from "@/features/orders/status-actions";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function OrderDetailRoute() {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: order, isPending, error } = useQuery({
    queryKey: ["admin", "orders", orderId],
    queryFn: () => adminApi.orders.get(orderId as string),
    enabled: Boolean(orderId),
  });

  if (isPending) return <LoadingState />;
  if (error || !order) {
    return (
      <ErrorState
        message={
          error instanceof Error ? error.message : "Could not load this order."
        }
      />
    );
  }

  const timeline = [
    { label: "Placed", at: order.placedAt },
    { label: "Confirmed", at: order.confirmedAt },
    { label: "Shipped", at: order.shippedAt },
    { label: "Delivered", at: order.deliveredAt },
    { label: "Cancelled", at: order.cancelledAt },
  ].filter((entry) => entry.at);

  return (
    <>
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Orders
      </Link>

      <header className="mt-4 mb-8 flex flex-wrap items-center gap-4">
        <h1 className="text-xl font-semibold tracking-tight">
          {order.orderNumber}
        </h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-muted-foreground">
          {formatDate(order.placedAt)}
        </span>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 font-medium">Items</h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 text-right font-medium">Unit</th>
                    <th className="px-4 py-3 text-right font-medium">Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-medium">{item.productName}</span>
                        {item.optionSummary ? (
                          <span className="block text-xs text-muted-foreground">
                            {item.optionSummary}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.variantSku}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatBDT(item.unitPrice, order.currency)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatBDT(item.lineTotal, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-medium">Update status</h2>
            <StatusActions orderId={order.id} status={order.status} />
            {order.cancelReason ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Cancelled: {order.cancelReason}
              </p>
            ) : null}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border p-5">
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
                  {formatBDT(order.shippingTotal, order.currency)}
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
                : order.paymentMethod}{" "}
              · {order.paymentStatus}
            </p>
          </section>

          <section className="rounded-lg border p-5">
            <h2 className="mb-3 font-medium">Shipping to</h2>
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

          {timeline.length > 0 ? (
            <section className="rounded-lg border p-5">
              <h2 className="mb-3 font-medium">Timeline</h2>
              <ol className="space-y-2 text-sm">
                {timeline.map((entry) => (
                  <li key={entry.label} className="flex justify-between gap-3">
                    <span>{entry.label}</span>
                    <span className="text-right text-muted-foreground">
                      {formatDate(entry.at as string)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
