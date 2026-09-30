import { useState } from "react";
import {
  isApiError,
  nextStatuses,
  ORDER_STATUS_LABELS,
} from "@urcommerce/api-client";
import type { OrderStatus } from "@urcommerce/api-client";
import { useUpdateOrderStatus } from "@/api/orders";
import { TextField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

type Props = {
  orderId: string;
  status: OrderStatus;
};

export function StatusActions({ orderId, status }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const mutation = useUpdateOrderStatus(orderId, {
    success: (updated) =>
      `Order marked ${ORDER_STATUS_LABELS[updated.status].toLowerCase()}.`,
    onSuccess: () => {
      setError(null);
      setPendingCancel(false);
      setCancelReason("");
    },
    onError: (mutationError) =>
      setError(
        isApiError(mutationError)
          ? mutationError.message
          : "Could not update the order.",
      ),
  });

  const available = nextStatuses(status);
  if (available.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No further changes are possible for this order.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {available.map((next) => {
          const isCancel = next === "CANCELLED";
          return (
            <Button
              key={next}
              variant={isCancel ? "outline" : "primary"}
              disabled={mutation.isPending}
              onClick={() =>
                isCancel
                  ? setPendingCancel(true)
                  : mutation.mutate({ status: next })
              }
              className={
                isCancel
                  ? "border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                  : undefined
              }
            >
              {isCancel
                ? "Cancel order"
                : `Mark ${ORDER_STATUS_LABELS[next].toLowerCase()}`}
            </Button>
          );
        })}
      </div>

      {pendingCancel ? (
        <div className="rounded-lg border border-destructive/30 p-4">
          <TextField
            id="cancelReason"
            label="Why is this order being cancelled?"
            fieldClassName="space-y-2"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            className="h-9"
          />
          <div className="mt-3 flex gap-2">
            <Button
              variant="destructive"
              disabled={cancelReason.trim() === ""}
              loading={mutation.isPending}
              loadingText="Cancelling…"
              onClick={() =>
                mutation.mutate({
                  status: "CANCELLED",
                  cancelReason: cancelReason.trim(),
                })
              }
            >
              Confirm cancellation
            </Button>
            <Button
              variant="outline"
              onClick={() => setPendingCancel(false)}
            >
              Keep order
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
