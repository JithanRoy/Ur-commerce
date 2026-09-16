"use client";

import Link from "next/link";
import { ShoppingBag, Trash2 } from "lucide-react";
import { formatBDT } from "@urcommerce/api-client";
import type { CartLine } from "@urcommerce/api-client";
import { useCart, useCartMutations } from "./use-cart";

function LineRow({ line }: { line: CartLine }) {
  const { updateItem, removeItem } = useCartMutations();
  const maxQuantity = Math.min(line.variant.stock, 100);

  return (
    <li className="flex gap-4 border-b py-5 last:border-0">
      <Link
        href={`/product/${line.product.slug}`}
        className="size-24 shrink-0 overflow-hidden rounded-lg bg-muted"
      >
        {line.product.image ? (
          <img
            src={line.product.image.url}
            alt={line.product.image.alt ?? line.product.name}
            className="size-full object-cover"
          />
        ) : null}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/product/${line.product.slug}`}
          className="font-medium hover:underline"
        >
          {line.product.name}
        </Link>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {line.variant.options.map((option) => option.value).join(" · ")}
        </p>

        {line.exceedsStock ? (
          <p role="alert" className="mt-1.5 text-sm text-destructive">
            Only {line.variant.stock} left — reduce the quantity to continue.
          </p>
        ) : null}

        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-9 items-center rounded-md border">
            <button
              type="button"
              onClick={() =>
                updateItem.mutate({
                  itemId: line.id,
                  quantity: line.quantity - 1,
                })
              }
              disabled={line.quantity <= 1 || updateItem.isPending}
              aria-label="Decrease quantity"
              className="h-full w-9 disabled:opacity-30"
            >
              −
            </button>
            <span className="w-8 text-center text-sm tabular-nums">
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                updateItem.mutate({
                  itemId: line.id,
                  quantity: line.quantity + 1,
                })
              }
              disabled={line.quantity >= maxQuantity || updateItem.isPending}
              aria-label="Increase quantity"
              className="h-full w-9 disabled:opacity-30"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => removeItem.mutate(line.id)}
            disabled={removeItem.isPending}
            aria-label={`Remove ${line.product.name}`}
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="text-right">
        <p className="font-medium tabular-nums">
          {formatBDT(line.lineTotal, line.currency)}
        </p>
        {line.quantity > 1 ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatBDT(line.unitPrice, line.currency)} each
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function CartClient() {
  const { data: cart, isPending, isError } = useCart();

  if (isPending) {
    return <p className="text-muted-foreground">Loading your cart…</p>;
  }

  if (isError || !cart || cart.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-8 py-20 text-center">
        <ShoppingBag
          className="mx-auto size-10 text-muted-foreground/40"
          aria-hidden
        />
        <p className="mt-4 font-medium">Your cart is empty</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse the shop and add something you like.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  const hasStockProblem = cart.items.some((line) => line.exceedsStock);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <ul>
        {cart.items.map((line) => (
          <LineRow key={line.id} line={line} />
        ))}
      </ul>

      <aside className="h-fit rounded-xl border p-6">
        <h2 className="font-medium">Summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Subtotal ({cart.itemCount}{" "}
              {cart.itemCount === 1 ? "item" : "items"})
            </dt>
            <dd className="tabular-nums">
              {formatBDT(cart.subtotal, cart.currency)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className="text-muted-foreground">Calculated at checkout</dd>
          </div>
        </dl>

        <Link
          href={hasStockProblem ? "/cart" : "/checkout"}
          aria-disabled={hasStockProblem}
          className={
            hasStockProblem
              ? "mt-6 flex h-11 cursor-not-allowed items-center justify-center rounded-md bg-primary/40 text-sm font-medium text-primary-foreground"
              : "mt-6 flex h-11 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          }
        >
          Checkout
        </Link>

        {hasStockProblem ? (
          <p className="mt-2 text-center text-xs text-destructive">
            Adjust quantities above to continue.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
