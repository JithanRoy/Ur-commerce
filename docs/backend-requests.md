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

## 1. 🟠 Product card payload has no option names — blocks on-card quick-add

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

## 2. 🟡 Order responses have no schema in Swagger

`statusHistory[]` and `adminNote` shipped (backend commit 95ca7dd) but the
admin order endpoints publish no response schema, so `docs-json` cannot
confirm the shape. The frontend typed it from `docs/api/api-contract.md`.
Please add the response DTOs so the contract is checkable.

---

## 3. 🟡 Deleted products keep their SKUs reserved forever

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

## 4. 🟡 No way back in after a forgotten password

There is no password-reset endpoint, so a store owner who forgets their
password is locked out with no self-service fix. On 2026-09-30 both demo
staff passwords changed and recovering them took a direct database write.
Please add a reset-by-email flow (`POST /auth/forgot-password`,
`POST /auth/reset-password` with a single-use, short-lived token); the
admin login will get a "Forgot password?" screen.

---

## 5. 🟠 Customers cannot attach photos to a review

Business request (2026-10-05): a customer reviewing a delivered product should
be able to add photos. Nothing on the backend supports it yet:

- `Review` has no images relation; `POST /reviews` and `PATCH /reviews/:id`
  accept only `productId`, `rating`, `title`, `body`.
- Every upload route is under `/admin/uploads/*`, so a customer token cannot
  get an upload ticket.

```bash
curl -s localhost:3002/api/docs-json | jq -r '.paths|keys[]' | grep -i upload
# /api/v1/admin/uploads/images
# /api/v1/admin/uploads/product-images
```

### Request

Reuse the existing ticket → PUT → attach flow with a customer-facing scope:

1. `POST /reviews/uploads` (customer, delivered buyer of the product only):
   `{ productId, contentType, size }` → `{ uploadUrl, objectKey, headers }`,
   same limits as product images (JPEG/PNG/WebP, size cap).
2. `POST /reviews` and `PATCH /reviews/:id` accept `imageObjectKeys: string[]`
   (max ~4; `PATCH` replaces the set, `[]` clears it). Reject keys not issued
   to this user.
3. `PublicReview`, `OwnReview` and `AdminReview` carry
   `images: [{ id, url, position }]`, ordered by `position`.
4. Hiding a review (`REJECTED`) hides its photos from the public list; admin
   moderation still shows them.

The storefront form, gallery on each review and admin moderation thumbnails
are ready to build as soon as this lands.

---

## 6. 🟠 Posted reviews must be final — the API still allows edit and delete

Business rule (2026-10-05): once a customer posts a review they cannot change
it. The storefront no longer offers Edit or Delete, but the API still accepts
both, so the rule is only cosmetic until the backend enforces it:

```bash
# with a customer token for a review they wrote
curl -s -X PATCH localhost:3002/api/v1/reviews/<id> -H "Authorization: Bearer $T" \
  -H 'X-Tenant-Host: demo.localhost' -H 'Content-Type: application/json' -d '{"rating":1}'
# → 200, rating changed
```

### Request

Remove (or 403) customer `PATCH /reviews/:id` and `DELETE /reviews/:id`.
Staff moderation (`PATCH /admin/reviews/:id/status`) stays. If support needs
to remove a review, that belongs on the admin side.

---

## 7. 🟡 Order lines have no product slug — no link back to the product

`OrderItem` carries `productId` but not `slug`, and the storefront's product
route is `/product/:slug`. `GET /products/:id` returns 404, so there is no
direct way to link an ordered item to its page. The storefront currently
resolves it by searching `/products?search=<name>` and matching the id on
click — it works for live products but is a workaround.

### Request

Add `productSlug: string | null` to each order line on `GET /orders` and
`GET /orders/:id` (null when the product was deleted or is no longer
active), and ideally `productImage: { url, alt } | null` for a thumbnail.
Order lines stay snapshots; these two are links, not prices.

---

## Delivered since the last version of this doc — thank you

Verified 2026-10-03 against backend `b66bcb0`:

- **Tenant from the storefront server in production** — `X-Tenant-Host` is
  trusted in production when sent with `X-Internal-Key` matching the API's
  `INTERNAL_API_KEY`. The storefront server now forwards the shopper's host
  and the key on every server fetch. **Deploy step:** set the same
  `INTERNAL_API_KEY` on the API and the storefront server.
- **CORS `maxAge: 7200`** — preflights are cached for two hours.
- **`Cache-Control: public, max-age=31536000, immutable`** on uploads — the
  header is signed into the presigned PUT; browser uploads verified working.
- **Safe hero links** — `javascript:`, `data:` and `//…` are now refused
  with a clear message (verified live).
- **Customer order timeline** — `GET /orders/:id` returns
  `timeline: [{ status, at }]` without actor or notes; the shopper's tracker
  shows the date of every step, including "Being prepared".

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
