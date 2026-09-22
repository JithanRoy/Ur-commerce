# Storefront Specification

The customer-facing shop. Next.js App Router, server-rendered where it matters.

Launch target is a **clothing store** — the size/colour variant model is
load-bearing and drives most of the non-obvious UI below.

## Routes

| Route | Data | Rendering |
|---|---|---|
| `/` | `GET /home` | SSR / ISR ~60s |
| `/shop` | `GET /products`, `GET /products/facets` | SSR, filters in the URL |
| `/product/[slug]` | `GET /products/:slug` | SSR + ISR |
| `/category/[slug]` | `GET /products?category=slug` | SSR |
| `/brand` · `/brand/[slug]` | `GET /brands`, `GET /products?brands=slug` | SSR |
| `/cart` | `GET /cart` | Client |
| `/checkout` | `POST /checkout/quote`, `POST /checkout` | Client, auth required |
| `/account/orders` · `/account/orders/[id]` | `GET /orders` | Client, auth required |
| `/account/addresses` | `GET /addresses` | Client, auth required |
| `/login` · `/register` | `POST /auth/login` · `/register` | Client |

---

## Homepage

One call returns everything. **Render sections in array order, switching on
`type`, and ignore types you do not recognise.**

```tsx
{data.sections.map((section, i) => {
  switch (section.type) {
    case "CATEGORY_GRID":    return <CategoryGrid key={i} {...section} />;
    case "PRODUCT_CAROUSEL": return <ProductCarousel key={i} {...section} />;
    case "BRAND_STRIP":      return <BrandStrip key={i} {...section} />;
    default:                 return null;
  }
})}
```

A section with nothing to show is **omitted entirely** — a new store returns
`sections: []`. Never index by position, and design an empty state for a store
with no catalogue.

`seeAllUrl` on a carousel is a ready-made link (`/shop?sort=discount`). Use it
rather than constructing your own.

This renderer is deliberately future-proof: sections are hardcoded server-side
today, but a `StorefrontSection` model will later let each store reorder and
retitle them without a deploy. Your `switch` will not change.

---

## Shop grid

**Filter state lives in the URL**, not React state — shareable, back-button
safe, SSR-able. The query params map 1:1 onto the API:

```
/shop?category=panjabi&brands=aarong&brands=shopno&minPrice=100000&sort=price-asc&page=2
```

Two calls, same params: `/products` for the grid, `/products/facets` for the
sidebar counts. Fire them in parallel.

**Prices in the URL are paisa**, matching the API. If you show a taka slider,
convert at the boundary: `minPrice = takaValue * 100`.

### The facets trap

`facets.brands` is display-ready — id, name, slug, logo, count.

`facets.categories` is **raw**: `[{ categoryId, count }]`, with a `null` row
for uncategorised products. Fetch `GET /categories` and join on id to get
labels. Cache the category tree aggressively; it changes rarely.

There is **no size, colour or price-range facet** yet. Do not design the
sidebar around them — see [gaps.md](gaps.md).

### Product card

```
┌──────────────────────┐
│  images[0] or        │   ← images is capped at 1 (thumbnail, not gallery);
│  placeholder         │     an empty array is normal
├──────────────────────┤
│ brand?.name          │   ← object or null, never a string
│ Product name         │
│ ৳1,899 — ৳1,999      │   ← minPrice…maxPrice; collapse when equal
│ ৳2,499  -24%         │   ← compareAtPrice strike + maxDiscountPct, if > 0
│ ★ 4.5 (18)           │   ← SUPPRESS until ratings are wired (see gaps)
└──────────────────────┘
```

Show a price **range** when `minPrice !== maxPrice`, a single price otherwise.
`totalStock === 0` → "Out of stock" badge, card still clickable.

Do not put an "Add to cart" button on a card for a product with multiple
variants — there is nothing to add until a size is chosen. Link to the detail
page.

---

## Product detail page

The most intricate screen. The customer picks option values; you resolve them
to exactly one variant.

### Variant resolution

```ts
type OptionLink = { optionValue: { value: string; option: { name: string; position: number } } };

const findVariant = (variants: Variant[], selection: Record<string, string>) =>
  variants.find((v) =>
    v.optionValues.every(
      (link) => selection[link.optionValue.option.name] === link.optionValue.value,
    ),
  );
```

Note the doubled `optionValue` key — that is the raw join shape, and it is
different from the flattened `variant.options` the cart returns.

### Rules

1. **Sort options and their values by `position`.** Alphabetical gives
   `L, M, S, XL`. Sort the option list by `option.position`, and the values
   within by their own `position`.
2. **Show out-of-stock combinations as disabled, not hidden.** A variant with
   `stock: 0` still comes back. Hiding it makes the size run look
   discontinuous, which reads as a bug.
3. **Grey out impossible combinations.** Once Colour: Black is picked, sizes
   with no Black variant should be disabled — compute from the variant list,
   do not call the API.
4. **Swap the gallery on colour change.** `images[].variantId` is `null` for
   shared images or a variant id for a colour-specific shot. Filter to the
   selected variant's images, falling back to the `null` ones.

   Admins can now pin images to variants, so this field is genuinely
   populated — but most products will still be all-`null` until someone does
   the pinning. **The `null` fallback is the common path, not the edge case.**
5. **Add to cart sends `variantId`**, never `productId`. Disable the button
   until a full combination is selected.
6. **Cap quantity at `variant.stock`**, and at 100 (the API's max).
7. Use `metaTitle` / `metaDescription` for `<head>`, falling back to name and
   truncated description.

### Price display

Show the **selected variant's** `price`, not the product's `minPrice`. Before a
selection, show the range. `compareAtPrice > price` → strike-through plus a
computed percentage.

---

## Cart

Every cart endpoint returns the **full cart summary** — never refetch after a
mutation, just replace state with the response. Optimistic updates are safe to
roll back the same way.

```
┌────────────────────────────────────────────────┐
│ [img] Classic Cotton Panjabi                   │
│       Size: 40, Colour: Black                  │ ← variant.options, already sorted
│       ৳1,899 × [2]  = ৳3,798                   │ ← unitPrice × quantity = lineTotal
│       ⚠ Only 1 left — reduce quantity          │ ← when exceedsStock is true
├────────────────────────────────────────────────┤
│ Subtotal (2 items)                    ৳3,798   │
│ Shipping           calculated at checkout      │
└────────────────────────────────────────────────┘
```

- `PATCH /cart/items/:itemId` takes an **absolute** quantity, not a delta.
  `0` removes the line — wire the "remove" button to either that or `DELETE`.
- `POST /cart/items` **increments** an existing line rather than duplicating.
- **Do not show a shipping total in the cart.** It depends on the delivery
  district and is only known after `/checkout/quote`.
- `exceedsStock: true` on any line must block "Proceed to checkout" — the API
  will reject it with 400 anyway.

### Guest carts

Generate an `X-Cart-Session` token, persist it, send it on every cart call
**and on login**. See
[04-auth-and-tenancy.md](04-auth-and-tenancy.md#guest-carts-and-the-login-merge).
Clear it after login and refetch the cart.

Requires the CORS fix in [conventions.md](conventions.md#10-guest-carts-need-a-header--and-a-cors-fix).

---

## Checkout

Auth required. Send an unauthenticated user to login with a `returnTo`, and
make sure the guest cart merges on the way back.

```
Step 1  Address     GET /addresses → pick, or POST a new one
Step 2  Shipping    POST /checkout/quote { addressId }   ← re-quote on every change
Step 3  Payment     Cash on delivery only (see gaps)
Step 4  Review      POST /checkout → order
```

**Quote on every address change.** Shipping is derived from `district`: free at
or above ৳2,000, else ৳60 in Dhaka and ৳120 elsewhere. Never compute this
client-side — mirror the server, and if the rule changes you would be silently
wrong.

A "৳201 more for free delivery" nudge is worth building; compute it from
`subtotal` against the 200000-paisa threshold.

### Payment methods

> Show **Cash on Delivery only**. `BKASH`/`NAGAD`/`ROCKET`/`CARD` are accepted
> by the API but nothing talks to a provider — the order would sit in
> `PENDING_PAYMENT` forever. Build the radio group so adding a method later is
> data, not surgery.

### Errors

| Status | Message | UI |
|---|---|---|
| 400 | `"Your cart is empty"` | Back to cart |
| 400 | `"Not enough stock for: SKU, SKU"` | Highlight those lines; refetch cart |
| **409** | `"\"Name\" (SKU) just went out of stock"` | **Refetch cart, show the line, ask them to adjust** |

The 409 is the important one: someone bought the last unit between page load
and submit. **Nothing was charged and no stock moved** — the whole transaction
rolled back. Make this recoverable in place, not a dead end.

Disable the submit button while in flight. There is no idempotency key on
checkout, so a double-click is a real risk of two orders.

---

## Order history and detail

Render **snapshots**:

- `items[].productName`, `variantSku`, `optionSummary`, `unitPrice`,
  `lineTotal` — all frozen at purchase time.
- `shippingAddress` (the JSON snapshot), **not** `address` (the live row,
  which may have been edited since).

`items[].variantId` is nullable — it survives variant deletion. Only use it to
build a "buy again" link, and handle `null`.

Show a status timeline from `placedAt` / `confirmedAt` / `shippedAt` /
`deliveredAt` / `cancelledAt`, skipping nulls.

> There is **no order cancellation endpoint**. Do not render a Cancel button.

---

## Bangladesh-specific details

- **Currency**: `৳`, no decimals in display (`৳1,899`). Amounts are paisa.
- **Phone**: `^(?:\+?880|0)1[3-9]\d{8}$` — validate client-side with the same
  regex so the user is not round-tripped.
- **Address** is division → district → thana → area, not street/city/state.
  `postCode` is optional; do not mark it required.
- **Timezone** UTC+6, no DST.
- **Mobile-first, and mean it.** The majority of traffic is mid-range Android
  on 3G/4G. Budget the bundle accordingly; this is why the admin panel is a
  separate app.
- Bengali/English toggle is not backed by the API — product content is
  single-language today. Do not promise i18n on catalogue text.
