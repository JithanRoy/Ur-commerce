import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  isApiError,
  nextStatuses,
  ORDER_STATUS_LABELS,
} from "@urcommerce/api-client";
import type { OrderStatus } from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";

type Props = {
  orderId: string;
  status: OrderStatus;
};

export function StatusActions({ orderId, status }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const mutation = useMutation({
    mutationFn: (next: { status: OrderStatus; cancelReason?: string }) =>
      adminApi.orders.changeStatus(orderId, next),
    onSuccess: () => {
      setError(null);
      setPendingCancel(false);
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
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
            <button
              key={next}
              type="button"
              disabled={mutation.isPending}
              onClick={() =>
                isCancel
                  ? setPendingCancel(true)
                  : mutation.mutate({ status: next })
              }
              className={
                isCancel
                  ? "h-9 rounded-md border border-destructive/40 px-4 text-sm text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
                  : "h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              }
            >
              {isCancel
                ? "Cancel order"
                : `Mark ${ORDER_STATUS_LABELS[next].toLowerCase()}`}
            </button>
          );
        })}
      </div>

      {pendingCancel ? (
        <div className="rounded-lg border border-destructive/30 p-4">
          <label htmlFor="cancelReason" className="text-sm font-medium">
            Why is this order being cancelled?
          </label>
          <input
            id="cancelReason"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            className="mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={mutation.isPending || cancelReason.trim() === ""}
              onClick={() =>
                mutation.mutate({
                  status: "CANCELLED",
                  cancelReason: cancelReason.trim(),
                })
              }
              className="h-9 rounded-md bg-destructive px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {mutation.isPending ? "Cancelling…" : "Confirm cancellation"}
            </button>
            <button
              type="button"
              onClick={() => setPendingCancel(false)}
              className="h-9 rounded-md border border-input px-4 text-sm"
            >
              Keep order
            </button>
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
