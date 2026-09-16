import { ORDER_STATUS_LABELS } from "@urcommerce/api-client";
import type { OrderStatus } from "@urcommerce/api-client";
import { cn } from "@/lib/utils";

const styles: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  CONFIRMED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  PROCESSING: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  SHIPPED: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  DELIVERED: "bg-success/10 text-success",
  CANCELLED: "bg-destructive/10 text-destructive",
  REFUNDED: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status],
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
