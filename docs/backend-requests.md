# Backend Requests — from the frontend team

Everything below was verified against the running API on 2026-09-22
(`localhost:3002`, tenant `demo.localhost`, seeded demo store).

Ordered by what blocks frontend work soonest.

---

## 1. 🔴 BUG — creating a product without options returns 500

**The simplest possible product cannot be created.** A product with one variant
and no Size/Colour options fails outright.

### Reproduce

```bash
TOKEN=$(curl -s -X POST http://localhost:3002/api/v1/auth/login \
  -H 'Content-Type: application/json' -H 'X-Tenant-Host: demo.localhost' \
  -d '{"email":"admin@demo.local","password":"password123"}' \
  | jq -r '.data.accessToken')

# FAILS — 500
curl -s -X POST http://localhost:3002/api/v1/admin/products \
  -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Host: demo.localhost' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Tote Bag","slug":"tote-bag","status":"DRAFT",
       "variants":[{"sku":"TOTE-STD","price":49900,"stock":40}]}'

# SUCCEEDS — 201, identical except it declares an option
curl -s -X POST http://localhost:3002/api/v1/admin/products \
  -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Host: demo.localhost' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Tote Bag 2","slug":"tote-bag-2","status":"DRAFT",
       "options":[{"name":"Size","values":["One Size"]}],
       "variants":[{"sku":"TOTE-OS","price":49900,"stock":40,
                    "optionValues":["One Size"]}]}'
```

`options: []` fails the same way as omitting the key.

### Server log

```
PrismaClientKnownRequestError:
Invalid `db.product.update()` invocation in
  src/modules/catalog/infrastructure/persistence/product.repository.ts:64:23

An operation failed because it depends on one or more records that were
required but not found. No record was found for an update.

  at ProductRepository.create (product.repository.ts:83)
  at ProductService.create (product.service.ts:113)
```

### Likely cause

`ProductService.create` branches at `product.service.ts:112`:

```ts
if (!dto.options?.length) {
  return this.afterWrite(tenantId, await this.repo.create(productData));
}
// ... else createWithVariantOptions(...)
```

The two paths use different clients:

- `createWithVariantOptions` holds `const tx = this.prisma.db` and uses it for
  every statement.
- `create` writes with `this.prisma.db.product.create(...)`, then calls
  `this.recomputeAggregates(product.id)` **with no client argument**, so it
  falls back to `const db = client ?? this.prisma` — a different accessor from
  `this.prisma.db`.

The subsequent `db.product.update({ where: { id } })` then cannot see the row
it just wrote, which matches the error exactly. Passing the same client
through is the obvious candidate:

```ts
await this.recomputeAggregates(product.id, this.prisma.db);
```

Please confirm the mechanism rather than taking our word for it — we are
reading this from outside and cannot see the tenant-scoping middleware.

### Why it matters

The admin product form defaults to a **single unnamed variant**, so this is the
first thing a store owner hits when adding a plain product (a bag, a mug,
anything without sizes). It also blocks us from testing add-to-cart directly
from a product card, which only applies to single-variant products.

### Acceptance

- `POST /admin/products` with no `options` key returns 201.
- Same with `options: []`.
- The created product reports correct `minPrice`, `maxPrice`, `totalStock`
  (i.e. aggregates actually recomputed, not skipped).
- A regression test covers the no-options path — it is currently untested,
  which is why this shipped.

---

## 2. 🟠 FEATURE — tenant settings (branding + storefront copy)

**Requested by the store owner.** They want to change their shop's colours and
some text without a developer.

No endpoint exists today — we checked; there are zero paths matching
`setting`, `theme` or `branding`. `gaps.md` §4 lists it as unbuilt.

We are **not** building an admin screen for this until it has a backend. A
colour picker that saves to `localStorage` would appear to work and then not
apply for any other visitor or device.

### What we need

```
GET   /api/v1/admin/settings     → the tenant's settings
PATCH /api/v1/admin/settings     → update (owner only, we assume)
GET   /api/v1/settings           → public subset, for the storefront
```

Suggested shape — please push back if the model differs:

```jsonc
{
  "storeName": "Demo Store",
  "tagline": "Everyday essentials",
  "logoUrl": null,
  "theme": {
    "brandHue": 265,        // 0–360
    "brandChroma": 0.12     // 0–0.4, oklch
  },
  "contact": {
    "email": "hello@demo.com",
    "phone": "01712345678"
  },
  "social": { "facebook": null, "instagram": null }
}
```

Two notes on the theme fields:

- Our entire palette already derives from `brandHue`/`brandChroma` as oklch
  values, so those two numbers are genuinely enough to re-skin the shop. If you
  would rather store a hex string we can convert, but then we need to know
  whether it is the primary, the accent, or both.
- The **public** `GET /settings` must not leak anything staff-only. Storefront
  pages are server-rendered for anonymous visitors.

### Acceptance

- Public endpoint is readable with no token, scoped by `Host` like the rest.
- A new tenant returns sensible defaults rather than 404 — the empty case is
  the common path for us.
- `PATCH` validates ranges (hue 0–360, chroma 0–0.4) rather than trusting us.

---

## 3. 🟡 FEATURE — collection detail endpoint

`GET /collections` returns the list, but there is **no** `GET /collections/:slug`
and no way to fetch a collection's products publicly.

```bash
curl -s http://localhost:3002/api/v1/collections -H 'X-Tenant-Host: demo.localhost'
# [{"id":"...","name":"Eid Edit","slug":"eid-edit","imageUrl":null,"productCount":0}]
```

So we can list collections but cannot build a page for one. Admin has
`/admin/collections/:id/products`; the storefront has no equivalent.

### What we need

Either a detail route:

```
GET /api/v1/collections/:slug   → collection + paginated products
```

…or a filter on the existing products endpoint:

```
GET /api/v1/products?collection=eid-edit
```

**We would prefer the filter.** Our shop grid, category pages and brand pages
all already run through `GET /products` with its pagination, sorting and
facets. A `?collection=` parameter would reuse all of it; a separate detail
route means a second pagination implementation for the same grid.

### Note

`Eid Edit` currently has `productCount: 0`, so there is nothing to render even
once this lands. Worth seeding a few products into it so the feature can be
demonstrated.

---

## 4. 🟡 Seed data — the demo store has 2 products

```bash
curl -s 'http://localhost:3002/api/v1/products?limit=100' \
  -H 'X-Tenant-Host: demo.localhost' | jq '.data.total'   # 2
```

Pagination, sorting, filters and facets are all built and all untestable with
two products — every page is page 1.

Also, running the storefront e2e suite **places real COD orders**, which drains
real stock. `DEN-IND-M` has hit 0 twice and had to be restocked manually.

### What would help

- ~20 products across the existing 4 categories and 2 brands.
- A mix of single-variant and multi-variant products (blocked on issue 1).
- A few deliberately out of stock, to exercise the sold-out states.
- Ideally `npm run seed:demo` being idempotent, so we can reset between test
  runs instead of hand-restocking.

---

## Not requested

For completeness, so nobody builds these on our account: we are **not** asking
for the payment gateway, refunds, customer-facing cancellation, reviews,
coupons, or brand/category image upload. We know they are missing and have
scoped around them per `gaps.md`.

---

## Contact

Frontend repo: `Ur-commerce` (separate from the backend).
Everything above was verified against a live API, not read from a schema.

If a shape changes, `docs/api/CHANGELOG.md` is the file we read — please keep
entries there and we will pick them up.
