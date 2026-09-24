import { ORDER_STATUS_LABELS } from "@urcommerce/api-client";
import type { OrderStatus } from "@urcommerce/api-client";
import { cn } from "@/lib/utils";

const styles: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-500/12 text-amber-700 ring-amber-600/20",
  CONFIRMED: "bg-sky-500/12 text-sky-700 ring-sky-600/20",
  PROCESSING: "bg-cyan-500/12 text-cyan-800 ring-cyan-600/20",
  SHIPPED: "bg-teal-500/12 text-teal-800 ring-teal-600/20",
  DELIVERED: "bg-success/12 text-success ring-success/25",
  CANCELLED: "bg-destructive/12 text-destructive ring-destructive/25",
  REFUNDED: "bg-muted text-muted-foreground ring-border",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        styles[status],
      )}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-current opacity-70"
      />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
