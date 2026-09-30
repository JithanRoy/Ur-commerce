import { ORDER_STATUS_LABELS } from "@urcommerce/api-client";
import type { AdminOrderStatusChange } from "@urcommerce/api-client";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function actorName(change: AdminOrderStatusChange): string {
  return change.byName ?? change.byEmail ?? "System";
}

export function StatusTimeline({
  history,
}: {
  history: AdminOrderStatusChange[];
}) {
  const latestIndex = history.length - 1;

  return (
    <ol className="space-y-4 text-sm">
      {history.map((change, index) => (
        <li key={change.id} className="relative flex gap-3">
          <span
            aria-hidden
            className={cn(
              "mt-1.5 size-2 shrink-0 rounded-full",
              index === latestIndex ? "bg-primary" : "bg-muted-foreground/40",
            )}
          />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "flex flex-wrap justify-between gap-x-3",
                index === latestIndex && "font-medium",
              )}
            >
              <span>{ORDER_STATUS_LABELS[change.status]}</span>
              <time
                dateTime={change.createdAt}
                className="font-normal text-muted-foreground"
              >
                {formatDate(change.createdAt)}
              </time>
            </p>
            <p className="text-xs text-muted-foreground">
              by {actorName(change)}
            </p>
            {change.note ? (
              <p className="mt-1 break-words text-xs text-foreground/80">
                {change.note}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
