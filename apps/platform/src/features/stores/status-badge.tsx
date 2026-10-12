import { STORE_STATUS_LABELS } from "@urcommerce/api-client";
import type { StoreStatus } from "@urcommerce/api-client";
import { cn } from "@/lib/utils";
import { statusDot } from "./status-style";

export function StatusBadge({
  status,
  className,
}: {
  status: StoreStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5 text-xs font-medium",
        status === "CANCELLED" && "text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", statusDot[status])}
      />
      {STORE_STATUS_LABELS[status]}
    </span>
  );
}
