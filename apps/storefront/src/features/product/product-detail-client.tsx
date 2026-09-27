"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isApiError } from "@urcommerce/api-client";
import { useCartMutations } from "@/features/cart/use-cart";
import { formatBDT, formatPriceRange } from "@urcommerce/api-client";
import type { ProductDetail } from "@urcommerce/api-client";
import { Check, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { VariantPicker } from "./variant-picker";
import { ProductGallery } from "./product-gallery";
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
  const router = useRouter();
  const { addItem } = useCartMutations();
  const [selection, setSelection] = useState<Selection>({});
  const [quantity, setQuantity] = useState(1);
  const [cartError, setCartError] = useState<string | null>(null);

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
    setCartError(null);
    setSelection((current) => ({ ...current, [optionName]: value }));
  }

  function onAddToCart() {
    if (!variant) return;
    setCartError(null);
    addItem.mutate(
      { variantId: variant.id, quantity },
      {
        onSuccess: () => router.push("/cart"),
        onError: (error) =>
          setCartError(
            isApiError(error)
              ? error.message
              : "Could not add this to your cart.",
          ),
      },
    );
  }

  const price = variant
    ? formatBDT(variant.price, variant.currency)
    : formatPriceRange(product.minPrice, product.maxPrice);

  const compareAt = variant?.compareAtPrice ?? null;
  const showsDiscount = compareAt !== null && variant !== null && compareAt > variant.price;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-14">
      <div className="lg:max-w-xl">
        <ProductGallery
          images={images}
          productName={product.name}
          badge={
            showsDiscount && compareAt !== null && variant !== null ? (
              <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-medium text-white">
                −{discountPercent(variant.price, compareAt)}%
              </span>
            ) : null
          }
        />
      </div>

      <div>
        {product.brand ? (
          <Link
            href={`/brand/${product.brand.slug}`}
            className="text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            {product.brand.name}
          </Link>
        ) : null}

        <h1 className="mt-2 text-balance font-display text-3xl font-semibold leading-tight sm:text-4xl">
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
          <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        ) : null}

        {isComplete && !isSoldOut ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-success">
            <Check className="size-4" aria-hidden />
            In stock
            {variant.stock <= 5 ? ` — only ${variant.stock} left` : ""}
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
          <div className="flex h-12 items-center rounded-full border bg-card">
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
            onClick={onAddToCart}
            disabled={!isComplete || isSoldOut || addItem.isPending}
            className="h-12 min-w-48 flex-1 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {addItem.isPending
              ? "Adding…"
              : isSoldOut
                ? "Sold out"
                : isComplete
                ? "Add to cart"
                  : `Select ${optionNamesInOrder(product)
                      .filter((name) => !selection[name])
                      .join(" and ")}`}
          </button>
        </div>

        {cartError ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {cartError}
          </p>
        ) : null}

        <ul className="mt-8 space-y-3 border-t pt-6">
          {[
            { icon: Truck, text: "Cash on delivery across Bangladesh" },
            { icon: ShieldCheck, text: "Free shipping on orders over ৳2,000" },
            { icon: RotateCcw, text: "7-day exchange on unworn items" },
          ].map((item) => (
            <li
              key={item.text}
              className="flex items-center gap-3 text-sm text-muted-foreground"
            >
              <item.icon className="size-4 shrink-0 text-primary/70" aria-hidden />
              {item.text}
            </li>
          ))}
        </ul>

        {variant ? (
          <p className="mt-6 text-xs text-muted-foreground">SKU {variant.sku}</p>
        ) : null}
      </div>
    </div>
  );
}
