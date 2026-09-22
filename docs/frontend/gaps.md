# Backend Gaps — plan around these

Everything the frontend might reasonably expect that **does not exist**. Read
this before estimating, so nothing is scoped against an endpoint that isn't
there.

Ordered by how much it blocks a launch. For what recently *started* existing,
see [CHANGELOG.md](CHANGELOG.md).

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

### 2. No customer-facing order cancellation

No endpoint. Do not render a Cancel button on the storefront. Staff **can**
cancel from the admin panel.

### 3. Refunds are a status flag only

`DELIVERED → REFUNDED` records the decision, but nothing calls a payment
provider to move money, and there is no partial refund or per-line
cancellation. No courier or tracking fields either.

---

## 🟠 Shapes the UI, needed soon

### 4. No tenant settings / branding

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

### 7. No image upload for brands or categories

`Brand.logoUrl` and `Category.imageUrl` are still bare strings. **Product**
images do upload — see *Product image upload* under Fixed.

**Frontend impact:** brand and category forms take a pasted https URL. Build
the field as a component you can swap, so it becomes an uploader without
touching those forms.

Also still missing for product images: no `srcset`/thumbnail sizes — one
full-size URL per image.

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

Staff cannot list or view customers. (Team/staff management **does** now
exist — see the Fixed section.)

---

## ✅ Fixed — do not re-report

### Store owners can manage their team

`GET/POST/PATCH/DELETE /admin/users` — owner-only (`TENANT_STAFF` gets 403).
Create staff with an initial password, change roles, deactivate and
reactivate. Customers never appear in the list.

Guarded against lockout: you cannot change your own role, deactivate yourself,
or remove the store's last active owner.

Not yet: invitation emails, per-permission grants, or roles beyond
`TENANT_OWNER` / `TENANT_STAFF`.

### Refresh tokens work, and logout is real

`POST /auth/refresh` rotates (the presented token is revoked and replaced) and
`POST /auth/logout` revokes server-side. Tokens are stored as SHA-256 hashes,
never raw. Access 15m, refresh 7d.

Build the 401 interceptor against these: refresh once, retry, and only clear
the session if the refresh itself 401s.

Not yet: logout-everywhere, device/session listing, and reuse detection (the
`replacedById` chain is recorded, so detecting a replayed token is a later
addition, not a redesign).

### Admin order management now exists

Staff can list, filter, search, view and progress orders:
`GET /admin/orders`, `GET /admin/orders/counts`, `GET /admin/orders/:id`,
`PATCH /admin/orders/:id/status`. See
[api-contract.md](api-contract.md#admin--orders-) for the transition
matrix.

Two behaviours worth knowing: cancelling **restores stock** unless the order
has already shipped, and delivering a cash-on-delivery order **settles its
payment** automatically.

### Product image upload

**Three steps, and the file never passes through this API:**

1. `POST /admin/uploads/product-images` with
   `{ fileName, contentType, contentLength }` →
   `{ objectKey, uploadUrl, expiresAt, requiredHeaders }`.
2. `PUT` the file to `uploadUrl`, sending `requiredHeaders` **verbatim**.
   `Content-Type` and `Content-Length` are signed into the URL, so any change
   gives 403 from storage — the most common integration failure. No
   `Authorization` header here, and the response has **no envelope**.
3. `POST /admin/products/:id/images` with `{ objectKey, alt?, variantId? }`.
   The server re-checks the stored object before recording it.

Also: `GET` the gallery, `PUT …/images/order` to reorder (**every** id, exactly
once), `PATCH …/images/:imageId` for `alt`/`variantId`, `DELETE` for removal.

Accepted: JPEG, PNG, WebP, AVIF, 1 byte – 10 MB. **SVG is refused.** A server
with no storage configured answers **503** on these routes and works normally
everywhere else — treat that as a feature flag, not an outage.

On the create-product form, upload during the media step and send the
`objectKey`s in `images[]`, so creation stays one call. Each entry takes either
`objectKey` or `url`, never both.

`variantId` pins an image to a variant, which is what makes the gallery swap
when a shopper picks a colour. It was always in the storefront payload and is
now actually populated.

Full contract in [api-contract.md](api-contract.md) under *Admin — product
images*.

### CORS now allows the frontend's custom headers

`src/main.ts` previously allowed only `Content-Type` and `Authorization`, so
the browser preflight rejected `X-Cart-Session` and `X-Tenant-Host` — guest
carts failed entirely and every local request failed tenant resolution, while
curl worked fine. Both header names are now in `allowedHeaders`, verified by an
`OPTIONS` preflight.

Still worth tightening before production: `origin: true` reflects **any**
origin. That is fine in development and should become an env-driven allowlist
when you deploy.

---

## ℹ️ Not a gap, but know it

### RLS is now enforced at runtime

Postgres Row-Level Security policies on all tenant-owned tables are active:
every request runs inside one tenant-scoped transaction, so the database
itself refuses to return another store's rows even if a query forgets to
filter.

Nothing about the frontend changes — same routes, same payloads, same status
codes. This is here only so you do not assume the *old* note (which said RLS
was inert) still applies while debugging a data-visibility question.

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
| Cart (guest + auth) | Flash sales, coupons |
| Addresses, checkout quote | Online payment |
| COD checkout, order history | Order cancellation |
| Admin: products, variants, taxonomy | Admin: customers, settings, dashboard |
| Admin: orders — list, filter, fulfil | Refunds that move money |
| Admin: team — staff, roles, access | Invitation emails |
| Admin: product image upload + gallery | Brand/category image upload, `srcset` |
