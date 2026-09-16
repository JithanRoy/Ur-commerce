# Backend Gaps — plan around these

Everything the frontend might reasonably expect that **does not exist**. Read
this before estimating, so nothing is scoped against an endpoint that isn't
there.

Ordered by how much it blocks a launch.

---

## 🔴 Blocking a real launch

### 1. No payment gateway

`PaymentMethod` includes `BKASH`, `NAGAD`, `ROCKET`, `CARD`, and a `Payment`
row is created per order — but **nothing talks to a provider**. Only
`CASH_ON_DELIVERY` completes a purchase. A gateway order would sit in
`PENDING_PAYMENT` forever.

**Frontend impact:** show COD only. Build the payment step as a data-driven
radio group so adding methods later is configuration, not a rewrite. Expect a
redirect-or-iframe flow plus a callback route when it lands.

### 2. ~~No admin order management~~ — RESOLVED 2026-09-16

> These endpoints now exist and the admin Orders module is built against them:
> `GET /admin/orders`, `GET /admin/orders/counts`, `GET /admin/orders/:id`,
> `PATCH /admin/orders/:id/status`. The backend enforces the transition graph
> and rejects invalid jumps with a clear message. The text below is retained
> for history.

### 2. No admin order management (historical)

Customers can place and read **their own** orders. Staff **cannot**:

- list the store's orders
- view any order
- change status (confirm, ship, deliver, cancel)
- refund

Nothing progresses an order past `CONFIRMED`. No one can fulfil from the panel.

**Frontend impact:** the admin Orders screen cannot be built. Do not mock it.

### 3. No customer-facing order cancellation

No endpoint. Do not render a Cancel button.

---

## 🟠 Shapes the UI, needed soon

### 4. ~~No refresh-token flow~~ — RESOLVED 2026-09-16

> `POST /auth/refresh` and `POST /auth/logout` exist and are wired into the
> admin client. The text below is retained for history.

### 4. No refresh-token flow (historical)

`refreshToken` is issued and signed; **no endpoint consumes it**. No rotation,
no revocation, no logout-everywhere.

**Frontend impact:** treat 401 as session-over → clear → redirect. Build the
401 interceptor now; store the refresh token so it is there when
`POST /auth/refresh` arrives.

### 5. No tenant settings / branding

Store name, logo, theme colours, contact details, social links, shipping
rates — none are editable or readable. Shipping is a hardcoded pure function
(free ≥ ৳2,000; ৳60 Dhaka / ৳120 elsewhere).

**Frontend impact:** brand the storefront from config for now, but **route
every branded value through one theme module** so swapping to an API call is a
single change.

### 6. Homepage sections are hardcoded

`GET /home` returns `CATEGORY_GRID`, two `PRODUCT_CAROUSEL`s (Hot Deals, New
Arrivals) and a `BRAND_STRIP`, decided server-side. A store cannot reorder,
retitle, hide a section, or add a banner.

A `StorefrontSection` model is planned. **Flash Sale is not modelled at all** —
it needs `startsAt`/`endsAt`, a price override, per-campaign stock allocation
and a sold counter, none of which `Collection` can express.

**Frontend impact:** the `switch (section.type)` renderer is already the right
shape — it will absorb this with no refactor. Do not hardcode section order in
the component tree.

### 7. No image upload

`ProductImage.url`, `Brand.logoUrl`, `Category.imageUrl` are bare strings with
no storage integration. Object storage is planned.

**Frontend impact:** URL inputs for now, behind a swappable component.

### 8. No review endpoints

The `Review` table exists; there is no controller. Customers cannot write
reviews; staff cannot moderate them.

Worse for display: **`avgRating` and `ratingCount` are never recomputed** —
every product reports defaults. **Suppress star ratings entirely** rather than
rendering a meaningless 0 or a stale number.

`isVerifiedPurchase` must be derived server-side from `orderId`, never trusted
from the client.

---

## 🟡 Affects specific features

### 9. `soldCount` is never recomputed

`?sort=best-sellers` therefore returns an **arbitrary order**. Do not build a
"Best Sellers" shelf on it yet.

Working sorts: `newest`, `price-asc`, `price-desc`, `discount` —
`minPrice`, `maxPrice`, `maxDiscountPct` and `totalStock` **do** recompute
correctly on every variant write.

### 10. No size, colour or price-range facets

`GET /products/facets` returns **categories and brands only**. There is no
size or colour facet, and `ProductOptionValue` has no swatch/hex field — so no
colour dots in a filter sidebar.

You can still *filter* by `minPrice`/`maxPrice` via `/products`; there is just
no bucketed count for it.

**Frontend impact:** for a clothing store this is a notable omission. Scope the
sidebar to category + brand + price range + in-stock.

### 11. `facets.categories` is unresolved

Returns `[{ categoryId, count }]` with a `null` row for uncategorised. Join
against `GET /categories` for labels. `facets.brands` is display-ready by
contrast.

### 12. No coupons or discounts

`discountTotal` is always `0`. No `Coupon` model. No promo-code field belongs
in checkout yet.

### 13. No `SizeGuide` model

No per-category size chart, no fit feedback on reviews. For apparel this
matters for return rates — flag it as a product decision, not a frontend one.

### 14. No platform endpoints

`/api/v1/platform/*` has **zero controllers**. Tenants are created by a seed
script. The platform console cannot be built.

### 15. No customer management in admin

Staff cannot list or view customers. No admin user management either — extra
staff accounts are created by direct DB access.

---

## 🐛 Confirmed bug — fix before frontend work

### CORS blocks the headers the frontend must send

`src/main.ts`:

```ts
allowedHeaders: ["Content-Type", "Authorization"],
```

This omits **`X-Cart-Session`** and **`X-Tenant-Host`**. The browser preflight
rejects both, so:

- **guest carts fail entirely** from a browser
- **the dev tenant override fails**, and every local request 404s on tenant
  resolution

curl and Postman work fine, which makes this a genuinely confusing hour to
debug.

**Fix:**

```ts
allowedHeaders: ["Content-Type", "Authorization", "X-Cart-Session", "X-Tenant-Host"],
```

Also consider `origin: true` — it currently reflects any origin, which is fine
in dev but should be an allowlist in production.

---

## ℹ️ Not a gap, but know it

### RLS is applied but not enforced

Postgres Row-Level Security policies exist on all tenant-owned tables and are
proven fail-closed by an integration suite. They are **not yet active at
runtime**: the app connects as a superuser, and RLS is bypassed for
superusers. Application-level scoping is currently the only thing enforcing
isolation — and it does so correctly, with a tested guard suite behind it.

Nothing about the frontend changes. This is here so you do not assume a second
safety net while debugging a data-visibility question.

### Legacy `Product.brand` string

A legacy `brand` String column is superseded by the `brandRel` relation. The
storefront exposes the relation **as `brand`** — an object or `null`. If you
ever see a bare string in a public response, that is a regression.

---

## Summary for planning

| Can build now | Blocked |
|---|---|
| Full storefront browse, search, filter | Ratings/reviews display |
| Product detail with variant selection | Size/colour facets |
| Cart (guest + auth) ¹ | Flash sales, coupons |
| Addresses, checkout quote | Online payment |
| COD checkout, order history | Order cancellation |
| Admin: products, variants, taxonomy | Admin: orders, customers, settings, dashboard |

¹ after the CORS fix.
