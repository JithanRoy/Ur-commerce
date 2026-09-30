"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAppRouter } from "@/lib/navigation";
import { isApiError } from "@urcommerce/api-client";
import { useCartMutations } from "@/features/cart/use-cart";
import { formatBDT, formatPriceRange } from "@urcommerce/api-client";
import type { ProductDetail } from "@urcommerce/api-client";
import {
  Check,
  Mail,
  MessageCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Zap,
} from "lucide-react";
import { useAuth } from "@/stores/auth";
import {
  LazySignInDialog,
  preloadSignInDialog,
  useIdleSignInWarmup,
} from "@/features/auth/lazy-sign-in-dialog";
import { VariantPicker } from "./variant-picker";
import { ProductGallery } from "./product-gallery";
import { ProductTabs } from "./product-tabs";
import {
  findVariant,
  imagesForVariant,
  maxQuantityFor,
  optionNamesInOrder,
  type Selection,
} from "./variant-resolution";
import { Button, IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function discountPercent(price: number, compareAtPrice: number): number {
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

const DESCRIPTION_CLAMP = 220;

export function ProductDetailClient({
  product,
  supportEmail,
}: {
  product: ProductDetail;
  supportEmail: string | null;
}) {
  const router = useAppRouter();
  const session = useAuth((state) => state.session);
  const { addItem } = useCartMutations();
  const [selection, setSelection] = useState<Selection>({});
  const [quantity, setQuantity] = useState(1);
  const [cartError, setCartError] = useState<string | null>(null);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [brokenStickyImage, setBrokenStickyImage] = useState<string | null>(
    null,
  );
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const buyBox = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const target = buyBox.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(entry ? !entry.isIntersecting : false),
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  function onSelect(optionName: string, value: string) {
    setQuantity(1);
    setCartError(null);
    setSelection((current) => ({ ...current, [optionName]: value }));
  }

  function addToCart(onDone: () => void) {
    if (!variant) return;
    setCartError(null);
    addItem.mutate(
      { variantId: variant.id, quantity },
      {
        onSuccess: onDone,
        onError: (error) =>
          setCartError(
            isApiError(error)
              ? error.message
              : "Could not add this to your cart.",
          ),
      },
    );
  }

  const onAddToCart = () => addToCart(() => router.push("/cart"));

  useIdleSignInWarmup(!session);

  const warmSignIn = () => {
    if (!session) preloadSignInDialog();
  };

  useEffect(() => {
    if (isComplete && !session) preloadSignInDialog();
  }, [isComplete, session]);

  const onBuyNow = () => {
    if (!variant) return;
    if (!session) {
      setSignInOpen(true);
      return;
    }
    addToCart(() => router.push("/checkout"));
  };

  const price = variant
    ? formatBDT(variant.price)
    : formatPriceRange(product.minPrice, product.maxPrice);

  const compareAt = variant?.compareAtPrice ?? null;
  const showsDiscount =
    compareAt !== null && variant !== null && compareAt > variant.price;
  const savePct =
    showsDiscount && compareAt !== null && variant !== null
      ? discountPercent(variant.price, compareAt)
      : product.maxDiscountPct;

  const description = product.description ?? "";
  const isLongDescription = description.length > DESCRIPTION_CLAMP;
  const shownDescription =
    !isLongDescription || descriptionOpen
      ? description
      : `${description.slice(0, DESCRIPTION_CLAMP).trimEnd()}…`;

  const addLabel = isSoldOut
    ? "Sold out"
    : isComplete
      ? "Add to cart"
      : `Select ${optionNamesInOrder(product)
          .filter((name) => !selection[name])
          .join(" and ")}`;

  const shareUrl = `${origin}/product/${product.slug}`;
  const shareText = encodeURIComponent(product.name);
  const encodedUrl = encodeURIComponent(shareUrl);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // clipboard unavailable; the share links still work
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-14">
        <div className="min-w-0 lg:max-w-xl">
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

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {showsDiscount && compareAt !== null ? (
              <span className="text-xl text-muted-foreground line-through">
                {formatBDT(compareAt)}
              </span>
            ) : null}
            <span
              className={cn(
                "text-3xl font-bold tracking-tight",
                showsDiscount && "text-destructive",
              )}
            >
              {price}
            </span>
            {showsDiscount && savePct > 0 ? (
              <span className="rounded bg-destructive px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                Save {savePct}%
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Tax included. Shipping calculated at checkout.
          </p>

          {description ? (
            <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">
              {shownDescription}
              {isLongDescription ? (
                <>
                  {" "}
                  <Button
                    variant="link"
                    onClick={() => setDescriptionOpen((open) => !open)}
                    className="text-[length:inherit] text-foreground underline"
                  >
                    {descriptionOpen ? "Read less" : "Read more"}
                  </Button>
                </>
              ) : null}
            </p>
          ) : null}

          {optionCount > 0 ? (
            <div className="mt-7">
              <VariantPicker
                product={product}
                selection={selection}
                onSelect={onSelect}
              />
            </div>
          ) : null}

          {isComplete && !isSoldOut ? (
            <p className="mt-5 inline-flex items-center gap-1.5 text-sm text-success">
              <Check className="size-4" aria-hidden />
              In stock
              {variant.stock <= 5 ? ` — only ${variant.stock} left` : ""}
            </p>
          ) : null}

          <div ref={buyBox} className="mt-6 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 items-center rounded-lg border bg-card">
                <IconButton
                  label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={!isComplete || quantity <= 1}
                  size="md"
                  className="h-full w-11 px-0 text-lg disabled:opacity-30"
                >
                  −
                </IconButton>
                <span className="w-10 text-center text-sm font-medium tabular-nums">
                  {quantity}
                </span>
                <IconButton
                  label="Increase quantity"
                  onClick={() =>
                    setQuantity((q) => Math.min(maxQuantity || 1, q + 1))
                  }
                  disabled={!isComplete || quantity >= maxQuantity}
                  size="md"
                  className="h-full w-11 px-0 text-lg disabled:opacity-30"
                >
                  +
                </IconButton>
              </div>

              <Button
                variant="outline"
                size="xl"
                shape="rounded"
                onClick={onAddToCart}
                disabled={!isComplete || isSoldOut}
                loading={addItem.isPending}
                loadingText="Adding…"
                leading={<ShoppingBag aria-hidden />}
                className="min-w-44 flex-1 border-2 border-foreground text-sm font-semibold uppercase tracking-wide shadow-none hover:bg-foreground hover:text-background disabled:border-input disabled:opacity-40"
              >
                {addLabel}
              </Button>
            </div>

            <Button
              size="xl"
              shape="rounded"
              fullWidth
              onClick={onBuyNow}
              onPointerEnter={warmSignIn}
              onFocus={warmSignIn}
              disabled={!isComplete || isSoldOut || addItem.isPending}
              leading={<Zap aria-hidden />}
              className="text-sm font-semibold uppercase tracking-wide hover:bg-primary hover:shadow-lg hover:shadow-primary/20 disabled:opacity-40 disabled:shadow-none"
            >
              Buy it now
            </Button>
          </div>

          {cartError ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {cartError}
            </p>
          ) : null}

          <dl className="mt-7 space-y-2 border-t pt-5 text-sm">
            {variant ? (
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">SKU</dt>
                <dd className="font-medium">{variant.sku}</dd>
              </div>
            ) : null}
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-muted-foreground">
                Availability
              </dt>
              <dd
                className={cn(
                  "font-medium",
                  product.totalStock > 0 ? "text-success" : "text-destructive",
                )}
              >
                {product.totalStock > 0 ? "In stock" : "Out of stock"}
              </dd>
            </div>
            {product.category ? (
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">
                  Category
                </dt>
                <dd>
                  <Link
                    href={`/category/${product.category.slug}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {product.category.name}
                  </Link>
                </dd>
              </div>
            ) : null}
            {product.brand ? (
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">Brand</dt>
                <dd>
                  <Link
                    href={`/brand/${product.brand.slug}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {product.brand.name}
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-4 border-t pt-5">
            <span className="text-sm text-muted-foreground">Share</span>
            <div className="flex items-center gap-1">
              {[
                {
                  label: "Share on Facebook",
                  href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
                  icon: MessageCircle,
                },
                {
                  label: "Share on WhatsApp",
                  href: `https://wa.me/?text=${shareText}%20${encodedUrl}`,
                  icon: Send,
                },
                {
                  label: "Share by email",
                  href: `mailto:?subject=${shareText}&body=${encodedUrl}`,
                  icon: Mail,
                },
              ].map((item) => (
                <IconButton
                  key={item.label}
                  asChild
                  label={item.label}
                  className="size-9 text-muted-foreground"
                >
                  <a href={item.href} target="_blank" rel="noreferrer">
                    <item.icon aria-hidden />
                  </a>
                </IconButton>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
                className="ml-1 h-9 text-xs shadow-none"
              >
                {linkCopied ? "Copied!" : "Copy link"}
              </Button>
            </div>

            {supportEmail ? (
              <a
                href={`mailto:${supportEmail}?subject=${encodeURIComponent(
                  `Question about ${product.name}`,
                )}`}
                className="ml-auto text-sm font-medium underline-offset-4 hover:underline"
              >
                Ask a question
              </a>
            ) : null}
          </div>

          <ul className="mt-6 space-y-3 border-t pt-5">
            {[
              { icon: Truck, text: "Cash on delivery across Bangladesh" },
              { icon: ShieldCheck, text: "Free shipping on orders over ৳2,000" },
              { icon: RotateCcw, text: "7-day exchange on unworn items" },
            ].map((item) => (
              <li
                key={item.text}
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <item.icon
                  className="size-4 shrink-0 text-primary/70"
                  aria-hidden
                />
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ProductTabs product={product} />

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-md transition-transform duration-300",
          showStickyBar ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="container-page flex items-center gap-3 py-3">
          {images[0] && images[0].url !== brokenStickyImage ? (
            <Image
              src={images[0].url}
              alt=""
              width={44}
              height={44}
              sizes="44px"
              onError={() => setBrokenStickyImage(images[0]?.url ?? null)}
              className="hidden size-11 rounded-md object-cover sm:block"
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="text-sm font-semibold">{price}</p>
          </div>
          <Button
            size="md"
            shape="rounded"
            onClick={onAddToCart}
            disabled={!isComplete || isSoldOut || addItem.isPending}
            leading={<ShoppingBag aria-hidden />}
            className="ml-auto px-5 disabled:opacity-40"
          >
            {isComplete ? "Add to cart" : "Choose options"}
          </Button>
        </div>
      </div>

      <LazySignInDialog
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSignedIn={() => {
          setSignInOpen(false);
          addToCart(() => router.push("/checkout"));
        }}
        returnTo={`/product/${product.slug}`}
        title="Sign in to buy"
        description={`You need an account to place an order. ${product.name} will be waiting in your bag.`}
      />
    </>
  );
}
