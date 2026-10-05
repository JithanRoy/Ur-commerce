"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingCart, Zap } from "lucide-react";
import { formatBDT, isApiError } from "@urcommerce/api-client";
import type {
  ProductDetail,
  ProductDetailVariant,
} from "@urcommerce/api-client";
import { useCartMutations } from "@/api/cart";
import { useProductDetail } from "@/api/products";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Radio } from "@/components/ui/input";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  imagesForVariant,
  maxQuantityFor,
  optionNamesInOrder,
  variantLabel,
} from "./variant-resolution";

export type QuickAddMode = "add" | "buy";

const LOW_STOCK_THRESHOLD = 5;

function cheapestInStock(product: ProductDetail): ProductDetailVariant | null {
  return product.variants.reduce<ProductDetailVariant | null>(
    (cheapest, variant) => {
      if (variant.stock <= 0) return cheapest;
      return cheapest === null || variant.price < cheapest.price
        ? variant
        : cheapest;
    },
    null,
  );
}

function stockNote(variant: ProductDetailVariant): string | null {
  if (variant.stock <= 0) return "Out of stock";
  if (variant.stock <= LOW_STOCK_THRESHOLD) return `Only ${variant.stock} left`;
  return null;
}

function VariantOptions({
  product,
  selectedId,
  onSelect,
}: {
  product: ProductDetail;
  selectedId: string | null;
  onSelect: (variant: ProductDetailVariant) => void;
}) {
  const legend = optionNamesInOrder(product).join(" / ") || "Option";

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Choose {legend}</legend>
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {product.variants.map((variant) => {
          const note = stockNote(variant);
          const soldOut = variant.stock <= 0;
          const selected = variant.id === selectedId;
          return (
            <Radio
              key={variant.id}
              name={`quick-add-${product.id}`}
              value={variant.id}
              checked={selected}
              disabled={soldOut}
              onChange={() => onSelect(variant)}
              containerClassName={cn(
                "flex w-full items-center rounded-lg border px-3 py-2.5 transition-colors [&>span:last-child]:flex-1",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:border-foreground/30",
              )}
              label={
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium">
                    {variantLabel(variant) || "Standard"}
                  </span>
                  <span className="text-right font-semibold tabular-nums">
                    {formatBDT(variant.price)}
                  </span>
                </span>
              }
              description={
                note ? (
                  <span className={cn(!soldOut && "text-warning")}>{note}</span>
                ) : undefined
              }
            />
          );
        })}
      </div>
    </fieldset>
  );
}

function QuantityStepper({
  quantity,
  max,
  onChange,
}: {
  quantity: number;
  max: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <div className="flex h-11 items-center rounded-lg border bg-card">
      <IconButton
        label="Decrease quantity"
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={quantity <= 1}
        size="md"
        className="h-full w-10 px-0 text-lg disabled:opacity-30"
      >
        −
      </IconButton>
      <span
        aria-live="polite"
        className="w-8 text-center text-sm font-medium tabular-nums"
      >
        {quantity}
      </span>
      <IconButton
        label="Increase quantity"
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        size="md"
        className="h-full w-10 px-0 text-lg disabled:opacity-30"
      >
        +
      </IconButton>
    </div>
  );
}

function QuickAddSkeleton() {
  return (
    <LoadingRegion label="Loading options" className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </LoadingRegion>
  );
}

function AddedConfirmation({ onClose }: { onClose: () => void }) {
  return (
    <div role="status" className="animate-fade-in space-y-4 text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
        <Check className="size-6" aria-hidden />
      </span>
      <p className="font-medium">Added to your cart</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild shape="rounded" fullWidth>
          <Link href="/cart">View cart</Link>
        </Button>
        <Button variant="outline" shape="rounded" fullWidth onClick={onClose}>
          Keep shopping
        </Button>
      </div>
    </div>
  );
}

function VariantChooser({
  product,
  mode,
  onAdded,
}: {
  product: ProductDetail;
  mode: QuickAddMode;
  onAdded: () => void;
}) {
  const { addItem } = useCartMutations();
  const [selected, setSelected] = useState<ProductDetailVariant | null>(() =>
    cheapestInStock(product),
  );
  const [quantity, setQuantity] = useState(1);
  const maxQuantity = Math.max(1, maxQuantityFor(selected));
  const image = useMemo(
    () => imagesForVariant(product, selected?.id ?? null)[0] ?? null,
    [product, selected],
  );
  const showCompareAt =
    selected?.compareAtPrice != null &&
    selected.compareAtPrice > selected.price;

  const select = (variant: ProductDetailVariant) => {
    setSelected(variant);
    setQuantity((current) => Math.min(current, maxQuantityFor(variant) || 1));
  };

  const submit = () => {
    if (!selected) return;
    addItem.mutate(
      { variantId: selected.id, quantity },
      { onSuccess: onAdded },
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-4 pr-8">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {image ? (
            <Image
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center font-display text-2xl text-muted-foreground/30">
              {product.name.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          {product.brand ? (
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {product.brand.name}
            </p>
          ) : null}
          <h2
            id="quick-add-title"
            className="line-clamp-2 font-medium leading-snug"
          >
            {product.name}
          </h2>
          {selected ? (
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-semibold tabular-nums">
                {formatBDT(selected.price)}
              </span>
              {showCompareAt && selected.compareAtPrice !== null ? (
                <span className="text-xs text-muted-foreground line-through">
                  {formatBDT(selected.compareAtPrice)}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      {selected ? (
        <>
          <VariantOptions
            product={product}
            selectedId={selected.id}
            onSelect={select}
          />

          <div className="flex items-center gap-3">
            <QuantityStepper
              quantity={quantity}
              max={maxQuantity}
              onChange={setQuantity}
            />
            <Button
              shape="rounded"
              size="lg"
              className="flex-1"
              onClick={submit}
              loading={addItem.isPending}
              loadingText={mode === "buy" ? "Going to checkout…" : "Adding…"}
              leading={
                mode === "buy" ? (
                  <Zap aria-hidden />
                ) : (
                  <ShoppingCart aria-hidden />
                )
              }
            >
              {mode === "buy" ? "Buy now" : "Add to cart"}
            </Button>
          </div>

          {addItem.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {isApiError(addItem.error)
                ? addItem.error.message
                : "Could not add that. Please try again."}
            </p>
          ) : null}
        </>
      ) : (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
          Every option is out of stock right now.
        </p>
      )}

      <Link
        href={`/product/${product.slug}`}
        className="block text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        See full product details
      </Link>
    </div>
  );
}

export function QuickAddDialog({
  slug,
  productName,
  mode,
  onClose,
  onAdded,
}: {
  slug: string;
  productName: string;
  mode: QuickAddMode;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { data: product, isPending, isError } = useProductDetail(slug);
  const [added, setAdded] = useState(false);

  const handleAdded = () => {
    onAdded();
    if (mode === "add") setAdded(true);
  };

  return (
    <Dialog
      onClose={onClose}
      labelledBy={product ? "quick-add-title" : undefined}
      label={productName}
    >
      {added ? (
        <AddedConfirmation onClose={onClose} />
      ) : isPending ? (
        <QuickAddSkeleton />
      ) : isError || !product ? (
        <div className="space-y-3 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            We could not load the options for {productName}.
          </p>
          <Button asChild variant="outline" shape="rounded">
            <Link href={`/product/${slug}`}>Open the product page</Link>
          </Button>
        </div>
      ) : (
        <VariantChooser product={product} mode={mode} onAdded={handleAdded} />
      )}
    </Dialog>
  );
}
