import { useState } from "react";
import { Link } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { formatBDT, ORDER_STATUS_LABELS, ORDER_STATUSES } from "@urcommerce/api-client";
import type { OrderStatus } from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/features/orders/status-badge";
import { OrderStats } from "@/features/orders/order-stats";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrdersRoute() {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: counts } = useQuery({
    queryKey: ["admin", "orders", "counts"],
    queryFn: () => adminApi.orders.counts(),
  });

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "orders", { page, status, search }],
    queryFn: () =>
      adminApi.orders.list({
        page,
        limit: 20,
        ...(status ? { status } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Orders"
        count={data?.total}
        description="Every order placed in your store."
      />

      <div className="mb-6">
        <OrderStats counts={counts} orders={data} />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setStatus("");
          }}
          className={cn(
            "h-9 rounded-full px-3.5 text-sm font-medium transition-colors",
            status === ""
              ? "bg-primary text-primary-foreground shadow-xs"
              : "border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground",
          )}
        >
          All
        </button>
        {ORDER_STATUSES.filter((entry) => (counts?.[entry] ?? 0) > 0).map(
          (entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => {
                setPage(1);
                setStatus(entry);
              }}
              className={cn(
                "h-9 rounded-full px-3.5 text-sm font-medium transition-colors",
                status === entry
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground",
              )}
            >
              {ORDER_STATUS_LABELS[entry]}
              <span className="ml-1.5 tabular-nums opacity-70">
                {counts?.[entry]}
              </span>
            </button>
          ),
        )}
      </div>

      <input
        value={search}
        onChange={(event) => {
          setPage(1);
          setSearch(event.target.value);
        }}
        placeholder="Search by order number, name or phone"
        aria-label="Search orders"
        className="mb-5 h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 text-sm"
      />

      {isPending ? <LoadingState /> : null}

      {error ? (
        <ErrorState
          message={
            error instanceof Error ? error.message : "Could not load orders."
          }
        />
      ) : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          title={status || search ? "No matching orders" : "No orders yet"}
          description={
            status || search
              ? "Try a different filter."
              : "Orders placed in your store will appear here."
          }
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/60 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Placed</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/orders/${order.id}`}
                        className="font-medium hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {order._count.items}{" "}
                        {order._count.items === 1 ? "item" : "items"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {order.customerName}
                      <span className="block text-xs text-muted-foreground">
                        {order.customerPhone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(order.placedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatBDT(order.grandTotal, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={data.page <= 1}
                  className="h-9 rounded-md border px-3 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={data.page >= data.totalPages}
                  className="h-9 rounded-md border px-3 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
