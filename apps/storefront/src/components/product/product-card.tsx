"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShoppingBag, Zap } from "lucide-react";
import { formatBDT, formatPriceRange } from "@urcommerce/api-client";
import type {
  Paisa,
  ProductCard as ProductCardData,
} from "@urcommerce/api-client";
import { useAuth } from "@/stores/auth";
import { useCartMutations } from "@/features/cart/use-cart";
import { SignInDialog } from "@/features/auth/sign-in-dialog";
import { cn } from "@/lib/utils";

const LOW_STOCK_THRESHOLD = 5;

function highestCompareAtPrice(product: ProductCardData): Paisa | null {
  return product.variants.reduce<Paisa | null>((highest, variant) => {
    if (variant.compareAtPrice === null) return highest;
    return highest === null || variant.compareAtPrice > highest
      ? variant.compareAtPrice
      : highest;
  }, null);
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const router = useRouter();
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
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-all hover:border-foreground/15 hover:shadow-lg hover:shadow-foreground/5">
      <Link
        href={productHref}
        className="flex flex-col focus-visible:outline-none"
      >
        <div className="relative aspect-4/5 overflow-hidden bg-muted">
          {image && !imageBroken ? (
            <img
              src={image.url}
              alt={image.alt ?? product.name}
              loading="lazy"
              onError={() => setImageBroken(true)}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
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
          <button
            type="button"
            disabled
            className="h-10 w-full cursor-not-allowed rounded-lg border bg-muted/50 text-sm font-medium text-muted-foreground"
          >
            Out of stock
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onAddToBag}
              disabled={addItem.isPending}
              className={cn(
                "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-all",
                justAdded
                  ? "border-success bg-success text-white"
                  : "border-input hover:border-foreground/40 hover:bg-accent/40",
                addItem.isPending && "opacity-50",
              )}
            >
              {addItem.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : justAdded ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <ShoppingBag className="size-4" aria-hidden />
              )}
              <span className="truncate">
                {justAdded
                  ? "Added"
                  : needsChoice
                    ? "Choose options"
                    : "Add to bag"}
              </span>
            </button>

            <button
              type="button"
              onClick={onBuyNow}
              disabled={addItem.isPending}
              className={cn(
                "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-all hover:shadow-md hover:shadow-primary/20",
                addItem.isPending && "opacity-50",
              )}
            >
              <Zap className="size-4" aria-hidden />
              <span className="truncate">Buy now</span>
            </button>
          </div>
        )}

        {addItem.isError ? (
          <p role="alert" className="text-center text-xs text-destructive">
            Could not add that. Please try again.
          </p>
        ) : null}
      </div>

      <SignInDialog
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
