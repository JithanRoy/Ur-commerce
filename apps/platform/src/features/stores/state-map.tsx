import {
  STORE_STATUSES,
  STORE_STATUS_LABELS,
  STORE_STATUS_TRANSITIONS,
} from "@urcommerce/api-client";
import type { StoreStatus } from "@urcommerce/api-client";
import { cn } from "@/lib/utils";
import { statusDot } from "./status-style";

type Reach = "current" | "next" | "unreachable";

function reachOf(current: StoreStatus, status: StoreStatus): Reach {
  if (status === current) return "current";
  return STORE_STATUS_TRANSITIONS[current].includes(status)
    ? "next"
    : "unreachable";
}

const reachNote: Record<Reach, string> = {
  current: "current status",
  next: "can move here",
  unreachable: "not reachable from here",
};

export function StateMap({ current }: { current: StoreStatus }) {
  return (
    <div>
      <ol
        aria-label="Where this store can go"
        className="grid grid-cols-5 gap-1"
      >
        {STORE_STATUSES.map((status) => {
          const reach = reachOf(current, status);
          return (
            <li
              key={status}
              aria-label={`${STORE_STATUS_LABELS[status]}, ${reachNote[reach]}`}
              aria-current={reach === "current" ? "step" : undefined}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-2 w-full rounded-full",
                  reach === "current" && statusDot[status],
                  reach === "next" &&
                    cn("border-2 border-dashed", statusRing[status]),
                  reach === "unreachable" && "bg-muted",
                )}
              />
              <span
                className={cn(
                  "text-[11px] leading-tight",
                  reach === "current" && "font-semibold text-foreground",
                  reach === "next" && "text-foreground",
                  reach === "unreachable" && "text-muted-foreground/60",
                )}
              >
                {STORE_STATUS_LABELS[status]}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        Solid is where it is now. Tinted states are where it can go next; grey
        ones can&apos;t be reached from {STORE_STATUS_LABELS[current]}.
      </p>
    </div>
  );
}
