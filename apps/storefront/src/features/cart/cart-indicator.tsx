"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { formatBDT } from "@urcommerce/api-client";
import type { Cart, CartLine } from "@urcommerce/api-client";
import { useCart } from "@/api/cart";
import { Button } from "@/components/ui/button";
import { useDismissable } from "@/lib/use-dismissable";
import { cn } from "@/lib/utils";

const PREVIEW_LINES = 4;

function itemsLabel(count: number): string {
  return `${count} item${count === 1 ? "" : "s"}`;
}

function useBumpOnIncrease(count: number): boolean {
  const [bumping, setBumping] = useState(false);
  const previous = useRef(count);

  useEffect(() => {
    if (count > previous.current) {
      setBumping(true);
      const timer = window.setTimeout(() => setBumping(false), 400);
      previous.current = count;
      return () => window.clearTimeout(timer);
    }
    previous.current = count;
  }, [count]);

  return bumping;
}

function PreviewLine({ line }: { line: CartLine }) {
  const options = line.variant.options
    .map((option) => option.value)
    .join(" · ");
  return (
    <li className="flex gap-3 py-3">
      <Link
        href={`/product/${line.product.slug}`}
        className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted"
      >
        {line.product.image ? (
          <Image
            src={line.product.image.url}
            alt={line.product.image.alt ?? line.product.name}
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center font-display text-lg text-muted-foreground/40">
            {line.product.name.charAt(0)}
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/product/${line.product.slug}`}
          className="line-clamp-1 text-sm font-medium hover:text-primary"
        >
          {line.product.name}
        </Link>
        {options ? (
          <p className="truncate text-xs text-muted-foreground">{options}</p>
        ) : null}
        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
          {line.quantity} × {formatBDT(line.unitPrice, line.currency)}
        </p>
      </div>
      <p className="text-sm font-medium tabular-nums">
        {formatBDT(line.lineTotal, line.currency)}
      </p>
    </li>
  );
}

function EmptyPreview() {
  return (
    <div className="px-5 py-10 text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ShoppingBag className="size-5" aria-hidden />
      </span>
      <p className="mt-3 font-medium">Your cart is empty</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Find something you like and it will wait here.
      </p>
      <Button asChild size="md" shape="rounded" className="mt-5">
        <Link href="/shop">Start shopping</Link>
      </Button>
    </div>
  );
}

function CartPreview({ cart }: { cart: Cart }) {
  const hidden = cart.items.length - PREVIEW_LINES;
  const hasStockProblem = cart.items.some((line) => line.exceedsStock);

  return (
    <>
      <div className="flex items-baseline justify-between border-b px-5 py-3.5">
        <p className="font-medium">Your cart</p>
        <p className="text-xs text-muted-foreground">
          {itemsLabel(cart.itemCount)}
        </p>
      </div>
      <ul className="max-h-80 divide-y overflow-y-auto px-5">
        {cart.items.slice(0, PREVIEW_LINES).map((line) => (
          <PreviewLine key={line.id} line={line} />
        ))}
      </ul>
      {hidden > 0 ? (
        <p className="border-t px-5 py-2 text-center text-xs text-muted-foreground">
          and {hidden} more in your cart
        </p>
      ) : null}
      <div className="space-y-3 border-t bg-muted/30 px-5 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="font-semibold tabular-nums">
            {formatBDT(cart.subtotal, cart.currency)}
          </span>
        </div>
        {hasStockProblem ? (
          <p className="text-xs text-destructive">
            Some items exceed the stock left. Adjust them in your cart.
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Button asChild size="md" shape="rounded" variant="outline">
            <Link href="/cart">View cart</Link>
          </Button>
          <Button
            asChild
            size="md"
            shape="rounded"
            trailing={<ArrowRight aria-hidden />}
          >
            <Link href={hasStockProblem ? "/cart" : "/checkout"}>Checkout</Link>
          </Button>
        </div>
      </div>
    </>
  );
}

export function CartIndicator() {
  const { data: cart } = useCart();
  const count = cart?.itemCount ?? 0;
  const bumping = useBumpOnIncrease(count);
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissable(open, close, container);

  return (
    <div ref={container} className="relative">
      <Button
        variant="ghost"
        size="md"
        shape="pill"
        aria-label={
          count > 0 ? `Your cart, ${itemsLabel(count)}` : "Your cart, empty"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        data-cart-trigger=""
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "h-9 gap-2 px-2.5 text-muted-foreground hover:text-foreground",
          open && "bg-muted text-foreground",
        )}
      >
        <span className="relative">
          <ShoppingBag
            className={cn(
              "size-[18px] transition-transform",
              bumping && "scale-110",
            )}
            aria-hidden
          />
          {count > 0 ? (
            <span
              aria-hidden
              data-cart-count=""
              className={cn(
                "absolute -right-2 -top-2 inline-flex min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4.5 text-primary-foreground ring-2 ring-background transition-transform",
                bumping && "scale-125",
              )}
            >
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </span>
        {cart && count > 0 ? (
          <span
            aria-hidden
            className="hidden text-sm font-medium tabular-nums text-foreground sm:inline"
          >
            {formatBDT(cart.subtotal, cart.currency)}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label="Cart preview"
          className="fixed inset-x-3 top-[4.25rem] z-50 animate-fade-in overflow-hidden rounded-2xl border bg-background shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96"
        >
          {cart && cart.items.length > 0 ? (
            <CartPreview cart={cart} />
          ) : (
            <EmptyPreview />
          )}
        </div>
      ) : null}
    </div>
  );
}
