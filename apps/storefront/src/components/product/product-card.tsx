"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShoppingBag } from "lucide-react";
import { formatBDT, formatPriceRange } from "@urcommerce/api-client";
import type {
  Paisa,
  ProductCard as ProductCardData,
} from "@urcommerce/api-client";
import { useCartMutations } from "@/features/cart/use-cart";
import { cn } from "@/lib/utils";

function priceLabel(product: ProductCardData): string {
  return formatPriceRange(product.minPrice, product.maxPrice);
}

function highestCompareAtPrice(product: ProductCardData): Paisa | null {
  return product.variants.reduce<Paisa | null>((highest, variant) => {
    if (variant.compareAtPrice === null) return highest;
    return highest === null || variant.compareAtPrice > highest
      ? variant.compareAtPrice
      : highest;
  }, null);
}

function soleBuyableVariant(product: ProductCardData) {
  if (product.variants.length !== 1) return null;
  const only = product.variants[0];
  return only && only.stock > 0 ? only : null;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const router = useRouter();
  const { addItem } = useCartMutations();
  const [justAdded, setJustAdded] = useState(false);

  const image = product.images[0];
  const isSoldOut = product.totalStock === 0;
  const compareAtPrice = highestCompareAtPrice(product);
  const hasDiscount = product.maxDiscountPct > 0 && compareAtPrice !== null;
  const directVariant = soleBuyableVariant(product);

  const handleAdd = () => {
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

  return (
    <div className="group relative flex h-full flex-col">
      <Link
        href={`/product/${product.slug}`}
        className="flex flex-1 flex-col focus-visible:outline-none"
      >
        <div className="relative aspect-4/5 overflow-hidden rounded-lg bg-muted">
          {image ? (
            <img
              src={image.url}
              alt={image.alt ?? product.name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <span className="font-display text-4xl text-muted-foreground/30">
                {product.name.charAt(0)}
              </span>
            </div>
          )}

          {isSoldOut ? (
            <span className="absolute left-3 top-3 rounded-full bg-background/95 px-2.5 py-1 text-xs font-medium">
              Out of stock
            </span>
          ) : null}

          {hasDiscount && !isSoldOut ? (
            <span className="absolute left-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-xs font-medium text-white">
              −{product.maxDiscountPct}%
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-1 flex-col space-y-1">
          {product.brand ? (
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {product.brand.name}
            </p>
          ) : null}

          <h3 className="line-clamp-2 text-sm font-medium leading-snug group-hover:underline">
            {product.name}
          </h3>

          <div className="mt-auto flex items-baseline gap-2 pt-1">
            <span className="text-sm font-semibold">{priceLabel(product)}</span>
            {hasDiscount && compareAtPrice !== null ? (
              <span className="text-xs text-muted-foreground line-through">
                {formatBDT(compareAtPrice)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="mt-3">
        {isSoldOut ? (
          <button
            type="button"
            disabled
            className="h-10 w-full rounded-full border border-input text-sm font-medium text-muted-foreground"
          >
            Out of stock
          </button>
        ) : directVariant ? (
          <button
            type="button"
            onClick={handleAdd}
            disabled={addItem.isPending}
            className={cn(
              "inline-flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors",
              justAdded
                ? "bg-foreground text-background"
                : "bg-primary text-primary-foreground hover:opacity-90",
              addItem.isPending && "opacity-60",
            )}
          >
            {addItem.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : justAdded ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <ShoppingBag className="size-4" aria-hidden />
            )}
            {justAdded ? "Added to bag" : "Add to bag"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push(`/product/${product.slug}`)}
            className="h-10 w-full rounded-full border border-input text-sm font-medium transition-colors hover:border-foreground/40"
          >
            Choose options
          </button>
        )}

        {addItem.isError ? (
          <p role="alert" className="mt-2 text-center text-xs text-destructive">
            Could not add that. Please try again.
          </p>
        ) : null}
      </div>
    </div>
  );
}
