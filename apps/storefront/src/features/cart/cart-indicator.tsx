"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./use-cart";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/button";

export function CartIndicator() {
  const { data: cart } = useCart();
  const count = cart?.itemCount ?? 0;
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

  return (
    <IconButton
      asChild
      label={
        count > 0
          ? `Your cart, ${count} item${count === 1 ? "" : "s"}`
          : "Your cart, empty"
      }
      className="size-9 text-muted-foreground"
    >
      <Link href="/cart">
        <ShoppingBag
          className={cn(
            "size-[18px] transition-transform",
            bumping && "scale-110",
          )}
        />
        {count > 0 ? (
          <span
            aria-hidden
            className={cn(
              "absolute -right-0.5 -top-0.5 inline-flex min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4.5 text-primary-foreground transition-transform",
              bumping && "scale-125",
            )}
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    </IconButton>
  );
}
