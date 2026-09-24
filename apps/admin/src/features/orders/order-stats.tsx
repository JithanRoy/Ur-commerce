import { Clock, PackageCheck, Truck, Wallet } from "lucide-react";
import { formatBDT } from "@urcommerce/api-client";
import type { OrderCounts, Paginated, Paisa } from "@urcommerce/api-client";
import type { AdminOrderListItem } from "@urcommerce/api-client";
import { cn } from "@/lib/utils";

type Tile = {
  label: string;
  value: string;
  hint: string;
  icon: typeof Clock;
  tone: "default" | "warning" | "success";
};

function revenueOf(orders: AdminOrderListItem[] | undefined): Paisa {
  if (!orders?.length) return 0 as Paisa;
  return orders
    .filter((order) => order.status !== "CANCELLED")
    .reduce<Paisa>((total, order) => (total + order.grandTotal) as Paisa, 0 as Paisa);
}

export function OrderStats({
  counts,
  orders,
}: {
  counts?: OrderCounts;
  orders?: Paginated<AdminOrderListItem>;
}) {
  const needsAction =
    (counts?.PENDING_PAYMENT ?? 0) + (counts?.CONFIRMED ?? 0);
  const inFlight = (counts?.PROCESSING ?? 0) + (counts?.SHIPPED ?? 0);

  const tiles: Tile[] = [
    {
      label: "Needs action",
      value: String(needsAction),
      hint: "Awaiting confirmation or packing",
      icon: Clock,
      tone: needsAction > 0 ? "warning" : "default",
    },
    {
      label: "In flight",
      value: String(inFlight),
      hint: "Being prepared or on the way",
      icon: Truck,
      tone: "default",
    },
    {
      label: "Delivered",
      value: String(counts?.DELIVERED ?? 0),
      hint: "Completed orders",
      icon: PackageCheck,
      tone: "success",
    },
    {
      label: "On this page",
      value: formatBDT(revenueOf(orders?.items)),
      hint: "Excludes cancelled orders",
      icon: Wallet,
      tone: "default",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-xl border bg-card p-4 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {tile.label}
            </p>
            <span
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-lg",
                tile.tone === "warning" && "bg-warning/15 text-warning",
                tile.tone === "success" && "bg-success/15 text-success",
                tile.tone === "default" && "bg-accent text-accent-foreground",
              )}
            >
              <tile.icon className="size-3.5" aria-hidden />
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
            {tile.value}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{tile.hint}</p>
        </div>
      ))}
    </div>
  );
}
