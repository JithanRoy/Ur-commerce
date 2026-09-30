"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAppRouter } from "@/lib/navigation";
import { Check, ShoppingBag, Zap } from "lucide-react";
import { formatBDT, formatPriceRange } from "@urcommerce/api-client";
import type {
  Paisa,
  ProductCard as ProductCardData,
} from "@urcommerce/api-client";
import { useAuth } from "@/stores/auth";
import { useCartMutations } from "@/features/cart/use-cart";
import {
  LazySignInDialog,
  preloadSignInDialog,
} from "@/features/auth/lazy-sign-in-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LOW_STOCK_THRESHOLD = 5;
const PRODUCT_CARD_IMAGE_SIZES =
  "(min-width: 1280px) 320px, (min-width: 640px) 33vw, 50vw";

function highestCompareAtPrice(product: ProductCardData): Paisa | null {
  return product.variants.reduce<Paisa | null>((highest, variant) => {
    if (variant.compareAtPrice === null) return highest;
    return highest === null || variant.compareAtPrice > highest
      ? variant.compareAtPrice
      : highest;
  }, null);
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const router = useAppRouter();
  const session = useAuth((state) => state.session);
  const { addItem } = useCartMutations();
  const [justAdded, setJustAdded] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const inStock = product.variants.filter((variant) => variant.stock > 0);
  const isSoldOut = product.totalStock === 0 || inStock.length === 0;
  const directVariant = inStock.length === 1 ? (inStock[0] ?? null) : null;
  const needsChoice = !isSoldOut && directVariant === null;

  const image = product.images[0];
  const compareAtPrice = highestCompareAtPrice(product);
  const hasDiscount = product.maxDiscountPct > 0 && compareAtPrice !== null;
  const isLowStock = !isSoldOut && product.totalStock <= LOW_STOCK_THRESHOLD;
  const productHref = `/product/${product.slug}`;

  const priceLabel = directVariant
    ? formatBDT(directVariant.price)
    : formatPriceRange(product.minPrice, product.maxPrice);

  const onAddToBag = () => {
    if (needsChoice) {
      router.push(productHref);
      return;
    }
    if (!directVariant) return;
    addItem.mutate(
      { variantId: directVariant.id, quantity: 1 },
      {
        onSuccess: () => {
          setJustAdded(true);
          window.setTimeout(() => setJustAdded(false), 2000);
        },
      },
    );
  };

  const warmSignIn = () => {
    if (!session) preloadSignInDialog();
  };

  const onBuyNow = () => {
    if (!session) {
      setSignInOpen(true);
      return;
    }
    if (needsChoice) {
      router.push(productHref);
      return;
    }
    if (!directVariant) return;
    addItem.mutate(
      { variantId: directVariant.id, quantity: 1 },
      { onSuccess: () => router.push("/checkout") },
    );
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-[box-shadow,border-color] hover:border-foreground/15 hover:shadow-lg hover:shadow-foreground/5">
      <Link
        href={productHref}
        className="flex flex-col focus-visible:outline-none"
      >
        <div className="relative aspect-4/5 overflow-hidden bg-muted">
          {image && !imageBroken ? (
            <Image
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              sizes={PRODUCT_CARD_IMAGE_SIZES}
              onError={() => setImageBroken(true)}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <span className="font-display text-5xl text-muted-foreground/25">
                {product.name.charAt(0)}
              </span>
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {isSoldOut ? (
              <span className="rounded-full bg-background/95 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-sm">
                Out of stock
              </span>
            ) : hasDiscount ? (
              <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                −{product.maxDiscountPct}%
              </span>
            ) : null}

            {isLowStock ? (
              <span className="rounded-full bg-background/95 px-2.5 py-1 text-xs font-medium text-warning shadow-sm backdrop-blur-sm">
                Only {product.totalStock} left
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-1 p-4 pb-0">
          {product.brand ? (
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {product.brand.name}
            </p>
          ) : null}

          <h3 className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
            {product.name}
          </h3>

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-1">
            <span className="text-base font-semibold tracking-tight">
              {priceLabel}
            </span>
            {hasDiscount && compareAtPrice !== null ? (
              <span className="text-xs text-muted-foreground line-through">
                {formatBDT(compareAtPrice)}
              </span>
            ) : null}
          </div>

          {needsChoice ? (
            <p className="text-xs text-muted-foreground">
              {inStock.length} options available
            </p>
          ) : null}
        </div>
      </Link>

      <div className="mt-auto flex flex-col gap-2 p-4 pt-3">
        {isSoldOut ? (
          <Button
            variant="outline"
            size="md"
            shape="rounded"
            fullWidth
            disabled
            className="bg-muted/50 text-muted-foreground shadow-none disabled:opacity-100"
          >
            Out of stock
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="md"
              shape="rounded"
              onClick={onAddToBag}
              loading={addItem.isPending}
              leading={
                justAdded ? <Check aria-hidden /> : <ShoppingBag aria-hidden />
              }
              className={cn(
                "min-w-0 flex-1 shrink gap-1.5 px-2 shadow-none",
                justAdded
                  ? "border-success bg-success text-white hover:bg-success hover:text-white"
                  : "hover:border-foreground/40 hover:bg-accent/40",
              )}
            >
              <span className="truncate">
                {justAdded
                  ? "Added"
                  : needsChoice
                    ? "Choose options"
                    : "Add to bag"}
              </span>
            </Button>

            <Button
              size="md"
              shape="rounded"
              onClick={onBuyNow}
              onPointerEnter={warmSignIn}
              onFocus={warmSignIn}
              disabled={addItem.isPending}
              leading={<Zap aria-hidden />}
              className="min-w-0 flex-1 shrink gap-1.5 px-2 hover:bg-primary hover:shadow-md hover:shadow-primary/20"
            >
              <span className="truncate">Buy now</span>
            </Button>
          </div>
        )}

        {addItem.isError ? (
          <p role="alert" className="text-center text-xs text-destructive">
            Could not add that. Please try again.
          </p>
        ) : null}
      </div>

      <LazySignInDialog
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSignedIn={() => {
          setSignInOpen(false);
          if (directVariant) {
            addItem.mutate(
              { variantId: directVariant.id, quantity: 1 },
              { onSuccess: () => router.push("/checkout") },
            );
            return;
          }
          router.push(productHref);
        }}
        returnTo={productHref}
        title="Sign in to buy"
        description={`You need an account to place an order. ${product.name} will be waiting in your bag.`}
      />
    </div>
  );
}
