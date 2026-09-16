import Link from "next/link";
import { formatBDT, formatPriceRange } from "@urcommerce/api-client";
import type {
  Paisa,
  ProductCard as ProductCardData,
} from "@urcommerce/api-client";

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

export function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.images[0];
  const isSoldOut = product.totalStock === 0;
  const compareAtPrice = highestCompareAtPrice(product);
  const hasDiscount = product.maxDiscountPct > 0 && compareAtPrice !== null;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block focus-visible:outline-none"
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

      <div className="mt-3 space-y-1">
        {product.brand ? (
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {product.brand.name}
          </p>
        ) : null}

        <h3 className="line-clamp-2 text-sm font-medium leading-snug group-hover:underline">
          {product.name}
        </h3>

        <div className="flex items-baseline gap-2 pt-0.5">
          <span className="text-sm font-semibold">{priceLabel(product)}</span>
          {hasDiscount && compareAtPrice !== null ? (
            <span className="text-xs text-muted-foreground line-through">
              {formatBDT(compareAtPrice)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
