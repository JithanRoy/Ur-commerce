"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingBag, Trash2, Truck } from "lucide-react";
import { formatBDT } from "@urcommerce/api-client";
import type { CartLine, Paisa } from "@urcommerce/api-client";
import { useCart, useCartLineMutations } from "./use-cart";
import { Button, IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CartSkeleton } from "@/components/ui/page-skeletons";

const FREE_SHIPPING_THRESHOLD = 200000 as Paisa;

function FreeShippingMeter({
  subtotal,
  currency,
}: {
  subtotal: Paisa;
  currency: string;
}) {
  const qualifies = subtotal >= FREE_SHIPPING_THRESHOLD;
  const remaining = (FREE_SHIPPING_THRESHOLD - subtotal) as Paisa;
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div className="mb-6 rounded-xl border bg-card p-4">
      <p className="flex items-center gap-2 text-sm">
        {qualifies ? (
          <>
            <Check className="size-4 shrink-0 text-success" aria-hidden />
            <span className="font-medium text-success">
              Your order ships free
            </span>
          </>
        ) : (
          <>
            <Truck className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              Add{" "}
              <span className="font-medium">
                {formatBDT(remaining, currency)}
              </span>{" "}
              more for free shipping
            </span>
          </>
        )}
      </p>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress towards free shipping"
      >
        <div
          className={cn(
            "h-full w-full origin-left transition-transform duration-500",
            qualifies ? "bg-success" : "bg-primary",
          )}
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>
    </div>
  );
}

function LineRow({ line }: { line: CartLine }) {
  const { updateItem, removeItem, isRemoving, lastAttemptFailed } =
    useCartLineMutations(line.id);
  const maxQuantity = Math.min(line.variant.stock, 100);

  return (
    <li className="flex gap-4 border-b py-5 last:border-0">
      <Link
        href={`/product/${line.product.slug}`}
        className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted"
      >
        {line.product.image ? (
          <Image
            src={line.product.image.url}
            alt={line.product.image.alt ?? line.product.name}
            fill
            sizes="96px"
            className="object-cover"
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

        {lastAttemptFailed ? (
          <p role="alert" className="mt-1.5 text-sm text-destructive">
            Could not update this item. Please try again.
          </p>
        ) : null}

        {line.exceedsStock ? (
          <p role="alert" className="mt-1.5 text-sm text-destructive">
            Only {line.variant.stock} left — reduce the quantity to continue.
          </p>
        ) : null}

        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-9 items-center rounded-md border">
            <IconButton
              label="Decrease quantity"
              size="sm"
              onClick={() => updateItem.mutate(line.quantity - 1)}
              disabled={line.quantity <= 1}
              className="h-full w-9 px-0 text-base disabled:opacity-30"
            >
              −
            </IconButton>
            <span className="w-8 text-center text-sm tabular-nums">
              {line.quantity}
            </span>
            <IconButton
              label="Increase quantity"
              size="sm"
              onClick={() => updateItem.mutate(line.quantity + 1)}
              disabled={line.quantity >= maxQuantity}
              className="h-full w-9 px-0 text-base disabled:opacity-30"
            >
              +
            </IconButton>
          </div>

          <IconButton
            label={`Remove ${line.product.name}`}
            variant="destructive-ghost"
            onClick={() => removeItem.mutate()}
            disabled={isRemoving}
            className="size-9"
          >
            <Trash2 />
          </IconButton>
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
    return <CartSkeleton />;
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
        <Button asChild shape="pill" className="mt-6 px-6">
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  const hasStockProblem = cart.items.some((line) => line.exceedsStock);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <div>
        <FreeShippingMeter subtotal={cart.subtotal} currency={cart.currency} />
        <ul className="rounded-xl border bg-card px-5">
          {cart.items.map((line) => (
            <LineRow key={line.id} line={line} />
          ))}
        </ul>
      </div>

      <aside className="h-fit rounded-xl border bg-card p-6 lg:sticky lg:top-24">
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

        <Button asChild fullWidth disabled={hasStockProblem} className="mt-6">
          <Link href={hasStockProblem ? "/cart" : "/checkout"}>Checkout</Link>
        </Button>

        {hasStockProblem ? (
          <p className="mt-2 text-center text-xs text-destructive">
            Adjust quantities above to continue.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
