import { STORE_STATUSES, STORE_STATUS_LABELS } from "@urcommerce/api-client";
import type { StoreStatus } from "@urcommerce/api-client";
import type { StoreCounts } from "@/api/stores";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { statusDot } from "./status-style";

export function FleetStrip({
  counts,
  selected,
  onSelect,
}: {
  counts: StoreCounts | null;
  selected: StoreStatus | undefined;
  onSelect: (status: StoreStatus | undefined) => void;
}) {
  if (!counts) {
    return (
      <div className="mb-6 space-y-3" aria-hidden>
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-5 w-2/3" />
      </div>
    );
  }

  const total = STORE_STATUSES.reduce((sum, status) => sum + counts[status], 0);
  if (total === 0) return null;
  const present = STORE_STATUSES.filter((status) => counts[status] > 0);

  return (
    <section aria-label="Stores by status" className="mb-6">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {present.map((status) => (
          <span
            key={status}
            title={`${STORE_STATUS_LABELS[status]}: ${counts[status]}`}
            style={{ flexGrow: counts[status] }}
            className={cn(
              "min-w-1.5 transition-opacity",
              statusDot[status],
              selected && selected !== status && "opacity-25",
            )}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-1 gap-y-1">
        {STORE_STATUSES.map((status) => {
          const active = selected === status;
          return (
            <li key={status}>
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={active}
                onClick={() => onSelect(active ? undefined : status)}
                disabled={counts[status] === 0 && !active}
                className={cn(
                  "gap-2 px-2.5 font-normal hover:bg-card disabled:opacity-40",
                  active && "bg-card shadow-sm ring-1 ring-border",
                )}
              >
                <span
                  aria-hidden
                  className={cn("size-2 rounded-full", statusDot[status])}
                />
                <span className="text-muted-foreground">
                  {STORE_STATUS_LABELS[status]}
                </span>
                <span className="font-semibold tabular-nums">
                  {counts[status]}
                </span>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
