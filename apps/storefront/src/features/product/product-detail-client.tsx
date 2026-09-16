"use client";

import { useMemo, useState } from "react";
import { formatBDT, formatPriceRange } from "@urcommerce/api-client";
import type { ProductDetail } from "@urcommerce/api-client";
import { VariantPicker } from "./variant-picker";
import {
  findVariant,
  imagesForVariant,
  maxQuantityFor,
  optionNamesInOrder,
  type Selection,
} from "./variant-resolution";

function discountPercent(price: number, compareAtPrice: number): number {
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function ProductDetailClient({ product }: { product: ProductDetail }) {
  const [selection, setSelection] = useState<Selection>({});
  const [quantity, setQuantity] = useState(1);

  const variant = useMemo(
    () => findVariant(product, selection),
    [product, selection],
  );

  const images = useMemo(
    () => imagesForVariant(product, variant?.id ?? null),
    [product, variant],
  );

  const optionCount = optionNamesInOrder(product).length;
  const isComplete = variant !== null;
  const maxQuantity = maxQuantityFor(variant);
  const isSoldOut = isComplete && maxQuantity === 0;

  function onSelect(optionName: string, value: string) {
    setQuantity(1);
    setSelection((current) => ({ ...current, [optionName]: value }));
  }

  const price = variant
    ? formatBDT(variant.price, variant.currency)
    : formatPriceRange(product.minPrice, product.maxPrice);

  const compareAt = variant?.compareAtPrice ?? null;
  const showsDiscount = compareAt !== null && variant !== null && compareAt > variant.price;

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="aspect-4/5 overflow-hidden rounded-xl bg-muted">
          {images[0] ? (
            <img
              src={images[0].url}
              alt={images[0].alt ?? product.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <span className="font-display text-6xl text-muted-foreground/30">
                {product.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
        {images.length > 1 ? (
          <div className="grid grid-cols-4 gap-3">
            {images.slice(1, 5).map((image) => (
              <div
                key={image.url}
                className="aspect-square overflow-hidden rounded-lg bg-muted"
              >
                <img
                  src={image.url}
                  alt={image.alt ?? ""}
                  className="size-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        {product.brand ? (
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            {product.brand.name}
          </p>
        ) : null}

        <h1 className="mt-1 font-display text-3xl font-semibold">
          {product.name}
        </h1>

        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-2xl font-semibold">{price}</span>
          {showsDiscount && compareAt !== null && variant !== null ? (
            <>
              <span className="text-muted-foreground line-through">
                {formatBDT(compareAt, variant.currency)}
              </span>
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-sm font-medium text-destructive">
                −{discountPercent(variant.price, compareAt)}%
              </span>
            </>
          ) : null}
        </div>

        {product.description ? (
          <p className="mt-5 text-pretty text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        ) : null}

        {optionCount > 0 ? (
          <div className="mt-8">
            <VariantPicker
              product={product}
              selection={selection}
              onSelect={onSelect}
            />
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex h-11 items-center rounded-md border">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={!isComplete || quantity <= 1}
              aria-label="Decrease quantity"
              className="h-full w-10 text-lg disabled:opacity-30"
            >
              −
            </button>
            <span className="w-10 text-center text-sm tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) => Math.min(maxQuantity || 1, q + 1))
              }
              disabled={!isComplete || quantity >= maxQuantity}
              aria-label="Increase quantity"
              className="h-full w-10 text-lg disabled:opacity-30"
            >
              +
            </button>
          </div>

          <button
            type="button"
            disabled={!isComplete || isSoldOut}
            className="h-11 flex-1 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSoldOut
              ? "Sold out"
              : isComplete
                ? "Add to cart"
                : `Select ${optionNamesInOrder(product)
                    .filter((name) => !selection[name])
                    .join(" and ")}`}
          </button>
        </div>

        {isComplete && !isSoldOut && variant.stock <= 5 ? (
          <p className="mt-3 text-sm text-destructive">
            Only {variant.stock} left
          </p>
        ) : null}

        {variant ? (
          <p className="mt-6 text-xs text-muted-foreground">
            SKU {variant.sku}
          </p>
        ) : null}
      </div>
    </div>
  );
}
