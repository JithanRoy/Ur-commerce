# Backend Requests — from the frontend team

Everything below was verified against the running API on **2026-10-01**
(`localhost:3002`, tenant `demo.localhost`, seeded demo store). Each item has a
runnable reproduce block. Ordered by what blocks frontend work soonest.

A correction first: an earlier version of this document reported
`GET /products?collection=` as a bug. It is not — `collection` was never a
parameter on that endpoint (the spec lists `page, limit, category, brands,
minPrice, maxPrice, inStockOnly, search, sort`). The 400 is correct
validation. Withdrawn.

---

## 1. 🔴 Server-rendered storefront pages cannot name their tenant in production

Launch blocker, found 2026-09-30 while profiling. The storefront renders
product, shop and home pages on its Node server, which then calls the API.
That server-to-server request carries the **API's** `Host`, not the shopper's.
`tenant.middleware.ts` honours `X-Tenant-Host` only outside production, and
the fallback tenant must be unset in production. So in production every
server-rendered page either resolves no tenant, or, worse, a build-time
prerender caches one tenant's page for all hostnames.

### Request

Accept the original shopper host from the storefront server in production,
but only from a trusted caller. Pick one:

- `X-Forwarded-Host`, honoured only behind a trusted proxy (`app.set("trust proxy", …)`), or
- `X-Tenant-Host` plus a shared secret header (`X-Internal-Key`) known only
  to the storefront server.

The frontend will forward `headers().get("host")` on every server fetch and
cache per host.

---

## 2. 🟡 CORS preflight is re-sent every 5 seconds

`enableCors` sets no `maxAge`, so Chrome caches the preflight for 5 s. Every
cart call (it sends the custom `X-Cart-Session` header) pays an extra
`OPTIONS` round trip, about 570 ms on 3G. One line in `main.ts`:

```ts
app.enableCors({ ..., maxAge: 7200 });
```

---

## 3. 🟡 Uploaded images are served without `Cache-Control`

MinIO objects come back with no `Cache-Control`, so repeat visits revalidate
every product image. The keys are unique UUIDs and never overwritten, so set
`Cache-Control: public, max-age=31536000, immutable` on upload (a
`Cache-Control` field in the presigned PUT, or a bucket policy).

---

## 4. 🟠 Product card payload has no option names — blocks on-card quick-add

Business gap. The storefront's product cards now carry "Add to bag / Buy now"
buttons. For a **single-variant** product this works end to end. For a
multi-variant product the card cannot offer a size picker, because
`ProductCard.variants[]` is only:

```jsonc
{ "id": "…", "price": 195000, "compareAtPrice": 249900, "stock": 20 }
```

No option names, no values, not even the SKU. A shopper must click through to
the detail page for every clothing product — which for this catalogue is
nearly all of them. Quick-add from the grid is a meaningful conversion lever.

### Request

Add a compact option summary to the card payload, e.g.

```jsonc
"options": [{ "name": "Size", "values": ["M", "L"] }],
"variants": [{ "id": "…", "price": …, "stock": …, "optionValues": ["M"] }]
```

Names and values only — the card does not need the full variant join.

---

## 5. 🟡 Order responses have no schema in Swagger

`statusHistory[]` and `adminNote` shipped (backend commit 95ca7dd) but the
admin order endpoints publish no response schema, so `docs-json` cannot
confirm the shape. The frontend typed it from `docs/api/api-contract.md`.
Please add the response DTOs so the contract is checkable.

---

## 6. 🟡 Deleted products keep their SKUs reserved forever

`DELETE /admin/products/:id` soft-deletes, and the dead product's SKUs stay
unique-constrained. Recreating a product after deleting it fails with
`"SKU already in use: …"` naming SKUs the admin cannot see anywhere in the
panel. Verified today: create → delete → identical create → 400.

Either exclude soft-deleted rows from the SKU uniqueness check, or suffix
their SKUs on delete (`FOR-M__deleted_<id>`), whichever fits the model. As it
stands an admin who deletes a mistyped product cannot make it again with the
same SKUs and gets no explanation.

Related: the tombstones also come back from `GET /admin/products` as ARCHIVED
rows with mangled slugs (`form-test-78482__archived_<id>`), polluting the
product list, and a PATCH against one 400s on its own slug. Deleted products
should be excluded from admin listings entirely. (The frontend currently
filters slugs containing `__archived_` as a workaround.)

---

## 7. 🔴 Hero button links accept `javascript:` URLs (stored XSS)

`PATCH /admin/hero/settings` saved `heroPrimaryUrl: "javascript:alert(1)"`
(verified 2026-10-01, reverted immediately). Any client that renders it as
an `href` runs script on every shopper's homepage. The admin form and the
storefront now both refuse such links, but the API is the real boundary.

### Request

Validate `heroPrimaryUrl`, `heroSecondaryUrl` and the per-slide
`primaryUrl` / `secondaryUrl`: allow only a site-relative path (`/…`, not
`//…`) or `https://…`, and add a length cap (the admin limits them to 500).

---

## 8. 🟡 No way back in after a forgotten password

There is no password-reset endpoint, so a store owner who forgets their
password is locked out with no self-service fix. On 2026-09-30 both demo
staff passwords changed and recovering them took a direct database write.
Please add a reset-by-email flow (`POST /auth/forgot-password`,
`POST /auth/reset-password` with a single-use, short-lived token); the
admin login will get a "Forgot password?" screen.

---

## 9. 🟡 Customers cannot see when their order entered PROCESSING

`statusHistory[]` is admin-only (by design — it carries who and notes), and
the customer `GET /orders/:id` has timestamps only for placed / confirmed /
shipped / delivered / cancelled. So the shopper's tracker can show "Being
prepared" as the current step but never its date.

### Request

Add a customer-safe history to `GET /orders/:id`: `statusHistory[]` with
`{ status, at }` only — no actor, no notes — or at least `processingAt`.

---

## Delivered since the last version of this doc — thank you

- **Hero styles and uploaded phone images** — `heroStyle`
  (`STATIC` / `CAROUSEL` / `OFF`), the editable static hero, and
  `mobileImageObjectKey` on slides (verified 2026-10-01). The admin manager
  exposes all three.
- **Homepage hero carousel** — `/home.hero`, `/hero` and the six
  `/admin/hero` endpoints (verified 2026-09-30). Storefront carousel and admin
  manager are built.

- **Order status history** — `statusHistory[]` (status, time, who, note)
  replaces the missing PROCESSING/REFUNDED timestamps; the admin order
  timeline now renders it. Not yet verified live (admin login currently
  rejected).
- **Batch image attach** — `POST /admin/products/{id}/images/batch`
  (in the spec 2026-09-30); the admin gallery is switching to it.

- **Store branding uploads** — `store` upload scope plus `logoObjectKey` /
  `faviconObjectKey` on `PATCH /admin/settings` (verified 2026-09-30: ticket →
  PUT → save → public `/store` returns the storage URL, served 200; clearing
  with `logoUrl: null` works). The admin branding screen now uploads instead
  of taking URLs.

- **Single-variant product create** — the 500 on optionless products is fixed
  (verified 2026-09-30: 201 with a clean payload). The simplest product can
  now be created.
- **Seed data** — 24 realistic products across categories with variants and
  real prices, delivered 2026-09-29. The ৳0 test product is gone too.
- **Object storage** — presigned uploads live end to end (verified 2026-09-28:
  ticket → PUT → attach → public URL).
- **Scoped uploads** for brand/category/collection with server-side scope
  enforcement.
- **Tenant settings** (`GET/PATCH /admin/settings`) with WCAG-computed
  `onPrimary`/`onAccent`.
- **`/auth/logout-all`**, refresh rotation, role-based refresh TTLs
  (12h staff / 7d customer).
- **`/admin/categories/tree`**.
