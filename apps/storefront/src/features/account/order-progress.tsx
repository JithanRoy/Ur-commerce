import { Check } from "lucide-react";
import type { Order, OrderStatus } from "@urcommerce/api-client";
import { cn } from "@/lib/utils";
import { formatOrderDate } from "./order-status";

type Step = { status: FlowStatus | "PLACED"; label: string; at: string | null };

const FLOW = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

type FlowStatus = (typeof FLOW)[number];

const STEP_LABELS: Record<FlowStatus | "PLACED", string> = {
  PLACED: "Order placed",
  CONFIRMED: "Confirmed",
  PROCESSING: "Being prepared",
  SHIPPED: "On its way",
  DELIVERED: "Delivered",
};

function stepsFor(order: Order): Step[] {
  const dates: Partial<Record<FlowStatus, string | null>> = {
    CONFIRMED: order.confirmedAt,
    SHIPPED: order.shippedAt,
    DELIVERED: order.deliveredAt,
  };
  return [
    { status: "PLACED", label: STEP_LABELS.PLACED, at: order.placedAt },
    ...FLOW.map((status) => ({
      status,
      label: STEP_LABELS[status],
      at: dates[status] ?? null,
    })),
  ];
}

function reachedIndex(status: OrderStatus): number {
  if (status === "PENDING_PAYMENT") return 0;
  const index = FLOW.findIndex((step) => step === status);
  return index === -1 ? -1 : index + 1;
}

export function isOrderSettled(status: OrderStatus | undefined): boolean {
  return (
    status === "DELIVERED" || status === "CANCELLED" || status === "REFUNDED"
  );
}

export function OrderProgress({ order }: { order: Order }) {
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return (
      <ol className="space-y-3">
        <ProgressRow
          label={STEP_LABELS.PLACED}
          at={order.placedAt}
          state="done"
        />
        <ProgressRow
          label={order.status === "CANCELLED" ? "Cancelled" : "Refunded"}
          at={order.cancelledAt}
          state="stopped"
        />
      </ol>
    );
  }

  const reached = reachedIndex(order.status);
  return (
    <ol className="space-y-3">
      {stepsFor(order).map((step, index) => (
        <ProgressRow
          key={step.status}
          label={step.label}
          at={step.at}
          state={
            index < reached
              ? "done"
              : index === reached
                ? "current"
                : "upcoming"
          }
        />
      ))}
    </ol>
  );
}

function ProgressRow({
  label,
  at,
  state,
}: {
  label: string;
  at: string | null;
  state: "done" | "current" | "upcoming" | "stopped";
}) {
  return (
    <li
      aria-current={state === "current" ? "step" : undefined}
      className="flex items-center gap-3"
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          state === "done" && "border-foreground bg-foreground text-background",
          state === "current" &&
            "border-primary bg-primary/10 ring-4 ring-primary/10",
          state === "upcoming" && "border-foreground/20",
          state === "stopped" && "border-destructive bg-destructive/10",
        )}
      >
        {state === "done" ? <Check className="size-3" aria-hidden /> : null}
        {state === "current" ? (
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
        ) : null}
      </span>
      <span
        className={cn(
          "text-sm",
          state === "upcoming" && "text-muted-foreground",
          state === "current" && "font-medium text-primary",
          state === "stopped" && "font-medium text-destructive",
        )}
      >
        {label}
      </span>
      <span className="ml-auto text-sm text-muted-foreground">
        {at ? formatOrderDate(at) : state === "current" ? "Now" : ""}
      </span>
    </li>
  );
}
