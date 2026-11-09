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

### 4. Store settings — branding done, content not

**Branding is editable now**: store name, tagline, logo, favicon, two theme
colours and contact details. See *Store settings* under Fixed.

Still **not** editable: shipping rates (a hardcoded pure function — free ≥
৳2,000, ৳60 Dhaka / ৳120 elsewhere), homepage section order, social links, and
arbitrary copy blocks. There is no key/value content store, so any text beyond
the fields above is still frontend-owned.

**Frontend impact:** drive colours, logo and store name from `GET /store`.
Everything else stays in config — but route it through one theme module so it
becomes an API call later without touching components.

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

### 7. Images have one size only

Product, brand, category and collection images all upload now — see *Image
upload* under Fixed. What is missing is **`srcset`/thumbnails and
`width`/`height`**: one full-size URL per image, and no dimensions, so the
browser cannot reserve space and grids shift as images load.

**Frontend impact:** put images behind a component you can later point at a
resizing URL without touching call sites, and give every image slot a fixed
`aspect-ratio` box.

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

### 14. No platform console UI

The **API exists**: `POST /platform/auth/login`, and `GET`/`POST
/platform/tenants`, `GET`/`PATCH /platform/tenants/:id`, `PATCH
/platform/tenants/:id/status` (see CLAUDE.md, "Platform console"). Stores
can be created, listed, edited (name, subdomain, custom domain, locale, time
zone), suspended and reactivated today, and a merchant's password can be
reset (`GET /platform/tenants/:id/staff`, `POST
/platform/tenants/:id/staff/:userId/reset-password`), through Swagger or
curl. What is missing is a screen for it. Also missing: billing, per-store
metrics, impersonation, and a 2FA reset for a locked-out merchant.

### 15. No customer management in admin

Staff cannot list or view customers. (Team/staff management **does** now
exist — see the Fixed section.)

---

## ✅ Fixed — do not re-report

### Realistic seed catalogue

`npm run db:seed-catalog` loads **20 BD clothing products** across Panjabi,
Saree, Kurti, Shirt, T-Shirts and Pants, under 8 real brands (Aarong, Yellow,
Richman, Ecstasy, Le Reve, Sailor, Tatlos, Fabrilife). Prices ৳690–4,290,
roughly half with a `compareAtPrice`, and several variants at zero stock so
out-of-stock states render. Idempotent — re-running skips what exists.

Grid, 3-page pagination, facets, all four sorts, search and the homepage
carousels are now all exercisable against real data.

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

**Session lifetime now depends on role.** A `CUSTOMER` refresh token lasts
**7 days**; every staff role (`TENANT_OWNER`, `TENANT_STAFF`) lasts **12
hours**. So the admin SPA will hit a forced re-login roughly twice a day while
the storefront stays signed in for a week. Build the 401 interceptor to handle
a failed refresh gracefully — on the admin side it is a normal daily event,
not an error worth showing a stack trace for.

**`POST /auth/logout-all`** revokes every session for the signed-in user,
including the one making the call. Requires a Bearer token, returns
`{ revokedSessions: <count> }`. Worth exposing in account settings as "sign
out of all devices"; it is the only remedy if a customer thinks their account
is compromised.

Not yet: device/session listing, and reuse detection (the `replacedById`
chain is recorded, so detecting a replayed token is a later addition, not a
redesign).

### Admin order management now exists

Staff can list, filter, search, view and progress orders:
`GET /admin/orders`, `GET /admin/orders/counts`, `GET /admin/orders/:id`,
`PATCH /admin/orders/:id/status`. See
[api-contract.md](api-contract.md#admin--orders-) for the transition
matrix.

Two behaviours worth knowing: cancelling **restores stock** unless the order
has already shipped, and delivering a cash-on-delivery order **settles its
payment** automatically.

### Store settings — branding

`GET /store` (public, cached) and `GET`/`PATCH /admin/settings` (**owner
only**). Covers `displayName`, `tagline`, `logoUrl`, `faviconUrl`,
`primaryColor`, `accentColor`, `supportEmail`, `supportPhone`.

`theme.onPrimary` / `theme.onAccent` come back as `"light"` or `"dark"` — the
readable text colour for that background at WCAG AA. **Use them rather than
assuming white**: a mid-tone brand colour like amber needs dark text, and the
API has already done the contrast maths.

`PATCH` is partial; an explicit `null` clears an optional field. Colours must
be six-digit hex and are stored upper-cased. A write invalidates the public
cache immediately.

Full contract in [api-contract.md](api-contract.md) under *Store settings*.

### Brand, category and collection images upload

`POST /admin/uploads/images` with `scope: "product" | "brand" | "category" |
"collection"`, then `PATCH /admin/brands/:id { logoObjectKey }` or
`PATCH /admin/categories/:id` / `PATCH /admin/collections/:id`
`{ imageObjectKey }`. One image each, not a gallery. They surface on
`GET /brands`, `GET /categories` and `GET /collections` immediately.

`scope` is enforced — a brand key attached to a category returns 403.
`logoUrl`/`imageUrl` still accept a pasted URL, but it must now be `https`,
and sending both it and the object key is a 400.

Full walkthrough in
[product-image-upload.md](product-image-upload.md#brand-logos-and-category-banners).

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

**Now an env-driven allowlist.** `CORS_ALLOWED_ORIGINS` is a comma-separated
list; in production the API refuses to boot without it. Leave it empty in
development and any origin is reflected, exactly as before — so nothing about
local work changes. When you deploy, your storefront and admin origins must
both be listed or the browser will block every call.

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
| Storefront theming from admin | Editable copy blocks, shipping rates |
