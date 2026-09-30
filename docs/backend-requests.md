# Backend Requests — from the frontend team

Everything below was verified against the running API on **2026-09-30**
(`localhost:3002`, tenant `demo.localhost`, seeded demo store). Each item has a
runnable reproduce block. Ordered by what blocks frontend work soonest.

A correction first: an earlier version of this document reported
`GET /products?collection=` as a bug. It is not — `collection` was never a
parameter on that endpoint (the spec lists `page, limit, category, brands,
minPrice, maxPrice, inStockOnly, search, sort`). The 400 is correct
validation. Withdrawn.

---

## 1. 🟠 Store branding logo/favicon cannot use uploaded images

The admin panel now uploads every image direct-to-storage — product galleries,
brand logos, category and collection banners all work with `objectKey`. The
one place still stuck on pasted URLs is **store settings**:

- `UpdateStoreSettingsDto` accepts only `logoUrl` / `faviconUrl` — no
  `logoObjectKey` / `faviconObjectKey` (verified in `docs-json` today).
- The upload-ticket scope enum is `product | brand | category | collection` —
  there is no `store` (or `branding`) scope to mint a ticket under.

### Request

1. Add a `store` scope to `POST /admin/uploads/images`.
2. Accept `logoObjectKey` and `faviconObjectKey` on `PATCH /admin/settings`,
   resolving to URLs on read exactly as `PATCH /admin/brands/:id` already does
   with `logoObjectKey`.

The brand implementation is the template; this is the same pattern on one more
entity. Until then the admin branding screen keeps two URL text fields the
owner has no way to fill without hosting the file somewhere themselves.

---

## 2. 🟠 Product card payload has no option names — blocks on-card quick-add

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

## 3. 🟡 Bulk image attach

`POST /admin/products/:id/images` takes exactly one `objectKey`. The admin
gallery supports multi-select and drag-drop upload, so attaching ten images is
ten sequential round-trips. A `{ "images": [...] }` batch variant (or
accepting an array on the existing route) would make batch upload atomic and
fast. Low urgency — the sequential loop works.

---

## 4. 🟡 No timestamp when an order enters PROCESSING (or REFUNDED)

The order model records `placedAt / confirmedAt / shippedAt / deliveredAt /
cancelledAt` — but nothing for PROCESSING or REFUNDED. Marking an order
"processing" updates `status` yet leaves no trace of *when*, so the admin
timeline cannot show the step (verified on ORD-202609-00019 today: status
PROCESSING, no matching timestamp anywhere in the payload).

The admin now shows the current status on the timeline labelled "current" as
a stopgap. Proper fix, pick one:

- add `processingAt` (and `refundedAt`), or
- better, a `statusHistory[] { status, at, byUserId }` — which would also
  give the store owner an audit trail of who changed what.

---

## 5. 🟡 Deleted products keep their SKUs reserved forever

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

## Delivered since the last version of this doc — thank you

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
