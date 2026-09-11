# Admin Panel Specification

The tenant's own admin panel. React SPA, fully authenticated, no SEO.

All routes are `@AdminOnly()`: `TENANT_OWNER` or `TENANT_STAFF` of **this**
store. `PLATFORM_OWNER` gets 403 — there is no super-admin mode, by design.

## Screens — and what exists to back them

| Screen | Backend | Status |
|---|---|---|
| Login | `POST /auth/login` | ✅ |
| Dashboard | — | ❌ **no stats endpoint** |
| Products list | `GET /admin/products` | ✅ |
| Product create/edit | `POST`/`PATCH /admin/products` | ✅ |
| Variant matrix | `PATCH /admin/products/:id/variants` | ✅ |
| Categories | `GET/POST/PATCH/DELETE /admin/categories` | ✅ |
| Brands | `GET/POST/PATCH/DELETE /admin/brands` | ✅ |
| Collections | `GET/POST/PATCH/DELETE /admin/collections` | ✅ |
| Orders | — | ❌ **no admin order endpoints** |
| Customers | — | ❌ none |
| Reviews | — | ❌ no controller |
| Settings / branding | — | ❌ none |
| Image upload | — | ❌ URL strings only |

**Build the top group now.** The ❌ rows are documented in
[08-backend-gaps.md](08-backend-gaps.md); do not stub them with fake data —
ship the nav item disabled or omit it.

---

## Login

Same endpoint as the storefront, on the store's host. Check `role` in the
response and reject `CUSTOMER` at the UI level with a clear message rather
than letting them in to hit 403s.

There is **no refresh flow** — treat 401 as session-over and redirect. Build
the 401 interceptor now so the day refresh lands it is a one-function change.

---

## Products list

`GET /admin/products?page=1&limit=20&search=&status=&categoryId=`

Admin rows come back **as stored**: `tenantId`, foreign keys, timestamps, and
**`costPrice`**. This is a different shape from the storefront projection —
give it its own type, do not reuse the public one.

Columns worth having: thumbnail, name, SKU count, price range
(`minPrice`–`maxPrice`), `totalStock`, status badge, updated at.

Status: `DRAFT` · `ACTIVE` · `ARCHIVED`. **Delete archives** — it never hard-
deletes, because order lines reference variants. Label the button "Archive",
and confirm with "this removes it from the storefront", not "this is
permanent".

---

## Product editor — the hard screen

This is where a naive form breaks. The rule:

> When a product declares `options`, **every variant must carry exactly one
> `optionValues` entry per declared option, in declaration order.**

Two options (Size × Colour) with 3 sizes and 2 colours means **6 variants**,
each with exactly 2 option values. Send a variant with one, or three, and you
get a 400.

### Recommended flow

```
Step 1  Basics      name, slug, description, category, brand, status
Step 2  Options     declare Size (40, 42, 44) and Colour (Black, Navy)
Step 3  Variants    ← GENERATE the 3×2 grid, then fill price/stock/SKU per row
Step 4  Images      URLs, with an optional variantId per image
```

**Generate the variant matrix client-side from the declared options** — the
cartesian product. Never make the user hand-enter combinations; that is where
the mismatch error comes from.

```
         Black      Navy
  40   [₹][stk]   [₹][stk]
  42   [₹][stk]   [₹][stk]
  44   [₹][stk]   [₹][stk]
```

Let the user delete rows they do not stock — but every remaining row must be
complete. Offer "apply price to all" and "apply stock to all"; filling 24 cells
by hand is the single worst part of running an apparel store.

### Prices are paisa

Show a taka input, store paisa. Multiply by 100 on submit, divide by 100 on
load. Never round-trip through a float.

`costPrice` is admin-only and drives margin display. It must never reach a
public response — if you ever see it in a storefront payload, that is a
security bug worth reporting.

### Position matters

`ProductOptionValue.position` is what orders sizes S → M → L → XL on the
storefront. **Give the user drag-to-reorder**, and do not sort values
alphabetically anywhere in this editor — what you save is what shoppers see.

### Errors

| Status | Cause | UI |
|---|---|---|
| 400 | Variant's `optionValues` count ≠ declared options | Point at the offending row |
| 400 | Zero variants | "A product needs at least one variant" |
| 409 | Duplicate slug **in this store** | Inline on the slug field |
| 409 | Duplicate SKU **in this store** | Inline on that variant row |
| 409 | Deleting the last variant | "Archive the product instead" |

Slug and SKU are unique **per store**, not globally — another tenant using the
same SKU is fine.

### Editing

`PATCH /admin/products/:id` handles **scalar fields only** — it deliberately
ignores variants, options and images, because replacing those arrays wholesale
would orphan order lines. Variants have their own endpoints:

- `POST   /admin/products/:id/variants` — add one
- `PATCH  /admin/products/:id/variants` — **bulk**, one transaction; use this
  for the matrix rather than N calls
- `PATCH  /admin/products/:id/variants/:variantId` — update one
- `DELETE /admin/products/:id/variants/:variantId` — refuses the last one

Any variant write recomputes `minPrice`, `maxPrice`, `maxDiscountPct` and
`totalStock`, which drive storefront sorting. Refetch the product after a bulk
save to show the new aggregates.

There is **no options/images endpoint** — they can only be set at create time.
Changing a product's option structure after launch is not currently supported;
warn the user at step 2.

---

## Categories

Self-referencing tree. `GET /admin/categories` is flat with counts;
`GET /admin/categories/tree` is nested for the editor.

Re-parenting is **cycle-safe** server-side (you cannot make a category its own
ancestor) — surface the error rather than reimplementing the check.

Delete is **blocked while products reference it**. Offer "move products to…"
before deleting.

## Brands

Flat list with product counts. Delete blocked while referenced.

`logoUrl` is a URL string — no upload. Same for category `imageUrl`.

## Collections

Curated product groupings that feed homepage shelves.

`PUT /admin/collections/:id/products` **replaces the membership and its order
wholesale** — send the complete ordered array, not a delta. A drag-to-reorder
list that submits the full list on save is the right shape.

---

## Screens with no backend — do not fake them

### Orders ❌

**There are no admin order endpoints.** Customers can place and read their own
orders (`GET /orders`); staff cannot list them, view one, or change status.

This is the biggest gap for a real store — no one can fulfil an order from the
panel today. Do not build a mock orders screen; it will diverge from whatever
ships.

### Dashboard ❌

No stats endpoint. Do not compute revenue by pulling every order client-side.

### Reviews ❌

The `Review` table exists; there is no controller. Also note `avgRating` and
`ratingCount` are **never recomputed**, so any rating shown today is a default.

### Settings / branding ❌

No tenant settings endpoint. Store name, logo, colours, shipping rates and the
homepage layout are not editable — shipping is a hardcoded pure function, and
homepage sections are hardcoded server-side.

### Image upload ❌

`ProductImage.url` is a bare string with no storage integration. For now the
form takes a URL. When object storage lands you will get an upload endpoint
returning a URL — so **build the field as a component you can swap**, not an
inline `<input>` scattered across the editor.

---

## Cross-cutting

**Tenant scoping is automatic.** Never send a tenant id; the host resolves it.
A 403 *"This resource belongs to another store"* means the admin panel is
served on a host that does not match the token's store.

**Every list is paginated** — flat `items` / `page` / `limit` / `total` /
`totalPages`, `limit` capped at 100. Server-side pagination everywhere; do not
fetch-all-and-filter.

**Optimistic updates are risky here.** Product writes recompute aggregates
server-side, so the response is authoritative. Prefer invalidate-and-refetch
over optimistic patching for anything touching variants.
