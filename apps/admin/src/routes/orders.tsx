import { Link } from "react-router";
import { keepPreviousData } from "@tanstack/react-query";
import { formatBDT, ORDER_STATUS_LABELS, ORDER_STATUSES } from "@urcommerce/api-client";
import type { OrderStatus } from "@urcommerce/api-client";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/features/orders/status-badge";
import { OrderStats } from "@/features/orders/order-stats";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useDebouncedSearchInput,
  useListLinkState,
  useListParams,
} from "@/lib/list-params";
import {
  useOrderCounts,
  useOrders,
  usePrefetchOrderDetail,
} from "@/api/orders";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusFilterChip({
  active,
  onSelect,
  children,
}: {
  active: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={active ? "primary" : "outline"}
      shape="pill"
      size="sm"
      onClick={onSelect}
      className={
        active
          ? "h-9 gap-0 px-3.5"
          : "h-9 gap-0 bg-card px-3.5 text-muted-foreground shadow-none hover:border-foreground/25 hover:bg-card"
      }
    >
      {children}
    </Button>
  );
}

export function OrdersRoute() {
  const { page, search, status, setPage, setStatus, commitSearch } =
    useListParams<OrderStatus>(ORDER_STATUSES);
  const searchInput = useDebouncedSearchInput(search, commitSearch);
  const linkState = useListLinkState();
  const prefetchOrder = usePrefetchOrderDetail();

  const { data: counts } = useOrderCounts();

  const { data, isPending, isPlaceholderData, error } = useOrders(
    { page, status, search },
    { placeholderData: keepPreviousData },
  );

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
        <StatusFilterChip
          active={status === ""}
          onSelect={() => setStatus("")}
        >
          All
        </StatusFilterChip>
        {ORDER_STATUSES.filter((entry) => (counts?.[entry] ?? 0) > 0).map(
          (entry) => (
            <StatusFilterChip
              key={entry}
              active={status === entry}
              onSelect={() => setStatus(entry)}
            >
              {ORDER_STATUS_LABELS[entry]}
              <span className="ml-1.5 tabular-nums opacity-70">
                {counts?.[entry]}
              </span>
            </StatusFilterChip>
          ),
        )}
      </div>

      <Input
        value={searchInput.input}
        onChange={(event) => searchInput.setInput(event.target.value)}
        placeholder="Search by order number, name or phone"
        aria-label="Search orders"
        className="mb-5 h-9 max-w-sm"
      />

      {isPending ? <LoadingState variant="table" /> : null}

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
          <div
            aria-busy={isPlaceholderData}
            className={cn(
              "overflow-x-auto rounded-xl border bg-card shadow-xs transition-opacity duration-200",
              isPlaceholderData && "opacity-60",
            )}
          >
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
                        state={linkState}
                        onMouseEnter={() => prefetchOrder(order.id)}
                        onFocus={() => prefetchOrder(order.id)}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, data.page - 1))}
                  disabled={data.page <= 1}
                  className="h-9 font-normal"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(data.page + 1)}
                  disabled={data.page >= data.totalPages}
                  className="h-9 font-normal"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
