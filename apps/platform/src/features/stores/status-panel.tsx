import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  STORE_STATUS_LABELS,
  STORE_STATUS_TRANSITIONS,
} from "@urcommerce/api-client";
import type { PlatformStore, StoreStatus } from "@urcommerce/api-client";
import { useChangeStoreStatus } from "@/api/stores";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { StateMap } from "./state-map";
import { StatusBadge } from "./status-badge";

const effects: Record<StoreStatus, string> = {
  TRIAL: "Full access to the shop and the admin panel.",
  ACTIVE: "Full access to the shop and the admin panel.",
  PAST_DUE:
    "Still full access. Use it as a reminder that payment is late; suspend only if it stays unpaid.",
  SUSPENDED:
    "Shoppers can still browse, but cannot check out. The owner and staff are locked out of the admin panel.",
  CANCELLED:
    "The store is closed for good. Shoppers can't place orders and the admin panel is locked. This can't be undone.",
};

const actions: Record<
  StoreStatus,
  { label: string; variant: ButtonVariant; confirm: string }
> = {
  TRIAL: { label: "Back to trial", variant: "outline", confirm: "" },
  ACTIVE: {
    label: "Activate",
    variant: "primary",
    confirm: "The shop and admin panel get full access again.",
  },
  PAST_DUE: {
    label: "Mark payment late",
    variant: "outline",
    confirm: "Nothing is blocked; the store is only flagged as past due.",
  },
  SUSPENDED: {
    label: "Suspend",
    variant: "outline",
    confirm:
      "Checkout stops and the owner is locked out of the admin panel. Shoppers can still browse. You can reactivate it later.",
  },
  CANCELLED: {
    label: "Close store permanently",
    variant: "destructive-ghost",
    confirm:
      "The store is closed for good: no orders and no admin access. This can't be undone.",
  },
};

function Confirmation({
  store,
  next,
  onCancel,
}: {
  store: PlatformStore;
  next: StoreStatus;
  onCancel: () => void;
}) {
  const change = useChangeStoreStatus(store.id);
  const [typed, setTyped] = useState("");
  const action = actions[next];
  const permanent = next === "CANCELLED";
  const ready = !permanent || typed.trim() === store.subdomain;

  return (
    <div
      role="alertdialog"
      aria-labelledby="confirm-status-title"
      className={
        permanent
          ? "mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
          : "mt-4 rounded-lg border bg-muted/40 p-4"
      }
    >
      <p
        id="confirm-status-title"
        className="flex items-center gap-2 font-medium"
      >
        {permanent ? (
          <AlertTriangle className="size-4 text-destructive" aria-hidden />
        ) : null}
        {action.label} {store.name}?
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{action.confirm}</p>
      {permanent ? (
        <TextField
          label={`Type ${store.subdomain} to confirm`}
          autoComplete="off"
          spellCheck={false}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          fieldClassName="mt-4 max-w-xs"
        />
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant={permanent ? "destructive" : "primary"}
          size="sm"
          disabled={!ready}
          loading={change.isPending}
          loadingText="Saving…"
          onClick={() => change.mutate(next, { onSuccess: onCancel })}
        >
          {action.label}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={change.isPending}
        >
          Keep {STORE_STATUS_LABELS[store.status].toLowerCase()}
        </Button>
      </div>
    </div>
  );
}

export function StatusPanel({ store }: { store: PlatformStore }) {
  const [pending, setPending] = useState<StoreStatus | null>(null);
  const transitions = STORE_STATUS_TRANSITIONS[store.status];

  return (
    <section
      aria-labelledby="status-title"
      className="rounded-xl border bg-card p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="status-title" className="font-semibold">
          Status
        </h2>
        <StatusBadge status={store.status} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {effects[store.status]}
      </p>
      <div className="mt-5">
        <StateMap current={store.status} />
      </div>

      {transitions.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          A cancelled store can't change status.
        </p>
      ) : pending ? (
        <Confirmation
          store={store}
          next={pending}
          onCancel={() => setPending(null)}
        />
      ) : (
        <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
          {transitions.map((next) => (
            <Button
              key={next}
              variant={actions[next].variant}
              size="sm"
              onClick={() => setPending(next)}
            >
              {actions[next].label}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
