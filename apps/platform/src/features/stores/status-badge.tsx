import { STORE_STATUS_LABELS } from "@urcommerce/api-client";
import type { StoreStatus } from "@urcommerce/api-client";
import { cn } from "@/lib/utils";

const tone: Record<StoreStatus, string> = {
  TRIAL: "bg-accent text-accent-foreground",
  ACTIVE: "bg-success/12 text-success",
  PAST_DUE: "bg-warning/15 text-foreground",
  SUSPENDED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground line-through",
};

export function StatusBadge({ status }: { status: StoreStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone[status],
      )}
    >
      {STORE_STATUS_LABELS[status]}
    </span>
  );
}
