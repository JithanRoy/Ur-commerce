# Prompt for the backend repo

Paste the text below into a session opened in the **backend** repo
(`shopno-puron-ecommerce`). It is written to be self-contained.

---

We have four requests from the frontend team, verified against the running API
on 2026-09-22. Work them in order — item 1 is a live bug blocking them, the
rest are features.

Before starting each one, reproduce the current behaviour yourself. Do not
trust the descriptions below over what the code actually does.

## 1. BUG (do this first) — creating a product without options returns 500

A product with one variant and no declared options cannot be created.

```bash
TOKEN=$(curl -s -X POST http://localhost:3002/api/v1/auth/login \
  -H 'Content-Type: application/json' -H 'X-Tenant-Host: demo.localhost' \
  -d '{"email":"admin@demo.local","password":"password123"}' \
  | jq -r '.data.accessToken')

# 500
curl -s -X POST http://localhost:3002/api/v1/admin/products \
  -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Host: demo.localhost' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Tote","slug":"tote-1","status":"DRAFT",
       "variants":[{"sku":"TOTE-1","price":49900,"stock":40}]}'

# 201 — identical but declares an option
curl -s -X POST http://localhost:3002/api/v1/admin/products \
  -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Host: demo.localhost' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Tote 2","slug":"tote-2","status":"DRAFT",
       "options":[{"name":"Size","values":["One Size"]}],
       "variants":[{"sku":"TOTE-2","price":49900,"stock":40,
                    "optionValues":["One Size"]}]}'
```

`options: []` fails the same way as omitting the key.

Server log:

```
PrismaClientKnownRequestError:
Invalid `db.product.update()` invocation in
  src/modules/catalog/infrastructure/persistence/product.repository.ts:64:23
"No record was found for an update."
  at ProductRepository.create (product.repository.ts:83)
  at ProductService.create (product.service.ts:113)
```

A hypothesis, which you should verify rather than accept: `ProductService.create`
branches on `!dto.options?.length`. The two branches use different Prisma
clients — `createWithVariantOptions` holds `const tx = this.prisma.db` and uses
it throughout, while `create` writes via `this.prisma.db.product.create` and
then calls `recomputeAggregates(product.id)` with no client, which falls back to
`client ?? this.prisma`. If that fallback is outside the tenant-scoped client,
the follow-up `update` cannot see the row it just wrote.

Done when:
- `POST /admin/products` with no `options` key returns 201.
- Same with `options: []`.
- The response carries correct `minPrice`, `maxPrice`, `totalStock` — confirm
  aggregates are computed, not merely skipped.
- A regression test covers the no-options path. It is currently untested, which
  is how this shipped.

## 2. FEATURE — tenant settings (branding and storefront copy)

Store owners want to change their shop's colours and some text without a
developer. No endpoint exists; `gaps.md` §4 lists it as unbuilt.

Add:

```
GET   /api/v1/admin/settings    (staff; owner-only if that fits your model)
PATCH /api/v1/admin/settings
GET   /api/v1/settings          (public, no token, scoped by Host)
```

The frontend suggested this shape — treat it as a starting point and tell them
if your model differs:

```jsonc
{
  "storeName": "Demo Store",
  "tagline": "Everyday essentials",
  "logoUrl": null,
  "theme": { "brandHue": 265, "brandChroma": 0.12 },
  "contact": { "email": "hello@demo.com", "phone": "01712345678" },
  "social": { "facebook": null, "instagram": null }
}
```

`brandHue` (0–360) and `brandChroma` (0–0.4) are oklch components — the
storefront derives its whole palette from those two numbers, so they are
sufficient to re-skin the shop. Validate the ranges server-side.

Done when:
- The public endpoint works with no token and leaks nothing staff-only.
- A tenant with no settings row returns defaults, not 404.
- Out-of-range hue/chroma is rejected with a clear 400.

## 3. FEATURE — let the storefront browse a collection

`GET /collections` lists collections but nothing can fetch one's products
publicly. Admin has `/admin/collections/:id/products`; the storefront has no
equivalent.

The frontend asked specifically for a **filter on the existing endpoint**
rather than a new detail route:

```
GET /api/v1/products?collection=<slug>
```

Their reasoning: the shop grid, category pages and brand pages already run
through `GET /products` with its pagination, sorting and facets. A new detail
route would mean reimplementing all of that for one screen. Follow that unless
there is a reason it will not work.

Done when:
- `?collection=<slug>` filters, and composes with existing `sort`, `page`,
  `limit` and the other filters.
- An unknown slug behaves like the other filters do for unknown values — match
  the existing convention rather than inventing one.

## 4. Seed data

The demo store has 2 products, so pagination, sorting and facets cannot be
exercised. Worse, the frontend e2e suite places real COD orders and drains real
stock — one variant has hit 0 twice and needed manual restocking.

Please extend the demo seed to roughly 20 products across the existing 4
categories and 2 brands, including:
- a mix of single-variant and multi-variant products (needs item 1 fixed first),
- a few deliberately out of stock, for sold-out states,
- some products in the `Eid Edit` collection, which currently has
  `productCount: 0`.

Make the seed idempotent if it is not already, so it can be re-run to reset
state between test runs.

## When you are done

Add an entry to `docs/api/CHANGELOG.md` for anything a client can observe, and
regenerate `docs/api/openapi.json`. That changelog is the file the frontend
reads to find out what moved.
