"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import type { OrderItem } from "@urcommerce/api-client";
import { useResolveOrderedProduct } from "@/api/products";
import { useAppRouter } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function searchHref(productName: string): string {
  return `/shop?${new URLSearchParams({ search: productName }).toString()}`;
}

function isPlainClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function OrderedProductLink({
  item,
  className,
  children,
}: {
  item: OrderItem;
  className?: string;
  children: ReactNode;
}) {
  const router = useAppRouter();
  const { prefetch, resolve } = useResolveOrderedProduct();
  const { productId, productName } = item;

  if (!productId) return <span className={className}>{children}</span>;

  async function open(event: MouseEvent<HTMLAnchorElement>) {
    if (!productId || !isPlainClick(event)) return;
    event.preventDefault();
    const slug = await resolve(productId, productName).catch(() => null);
    router.push(slug ? `/product/${slug}` : searchHref(productName));
  }

  return (
    <Link
      href={searchHref(productName)}
      onClick={open}
      onPointerEnter={() => prefetch(productId, productName)}
      onFocus={() => prefetch(productId, productName)}
      className={cn("hover:text-primary hover:underline", className)}
    >
      {children}
    </Link>
  );
}
