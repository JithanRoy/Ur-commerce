# Build Plan — what to build, in what order

The other docs describe **what the API does**. This one describes **what to
build and when**, so work can be picked up without re-reading the contract to
figure out where to start.

Every item below is backed by an endpoint that exists in the running API
today. Nothing here is speculative — if it is not listed, see
[gaps.md](gaps.md) before scoping it.

**69 endpoints live**: 5 auth, 23 storefront, 41 admin, 0 platform.

Sizes are rough: **S** ≈ a day, **M** ≈ 2–3 days, **L** ≈ a week, for one
developer already familiar with the stack.

---

## Phase 0 — Foundation (blocks everything)

Do this once, in both apps. Getting it wrong is the single biggest source of
rework, because every later screen inherits it.

| # | Task | Size | Backed by |
|---|---|---|---|
| 0.1 | Monorepo scaffold, two apps | M | [00-scaffold-prompt.md](00-scaffold-prompt.md) |
| 0.2 | Typed client generated from `openapi.json` | S | `npm run docs:openapi` |
| 0.3 | Fetch wrapper: unwrap envelope **once**, throw `ApiError` | S | [conventions.md](conventions.md) §1 |
| 0.4 | `X-Tenant-Host` in dev only, never in production | S | §4 |
| 0.5 | `formatBDT` — the only place division by 100 happens | S | §2 |
| 0.6 | Token storage + 401 interceptor: refresh once, retry, then log out | M | §5, [04-auth-and-tenancy.md](04-auth-and-tenancy.md) |
| 0.7 | Guest cart session token in `localStorage` | S | §10 |

**Definition of done for 0.3:** no component in either app ever sees
`.data.data`, and a 400 with field errors surfaces as `errors[]`.

**0.6 is the subtle one.** Access tokens last 15 minutes, refresh 7 days.
Refresh **rotates** — the old token is revoked, so two concurrent 401s must not
each fire a refresh. Queue them behind one in-flight refresh or the second gets
401 and logs the user out mid-session.

---

## Phase 1 — Storefront, browse-only (no account needed)

Ships a shoppable-looking site with zero auth. Good first milestone: it is
demoable and exercises most read paths.

| # | Task | Size | Endpoint |
|---|---|---|---|
| 1.1 | Homepage — render sections by `type`, ignore unknown | M | `GET /home` |
| 1.2 | Shop grid — pagination, sort, filters | L | `GET /products` |
| 1.3 | Filter sidebar — category + brand + price + in-stock | M | `GET /products/facets` |
| 1.4 | Product detail — variant picker, gallery | L | `GET /products/:slug` |
| 1.5 | Category / brand / collection landing pages | M | `GET /categories`, `/brands`, `/collections` |
| 1.6 | 404, empty states, loading skeletons | S | — |

**1.1** — a new store returns `sections: []`. Render by `section.type` in array
order; never index positionally. Unknown types must be skipped silently, not
crash — that switch is deliberately the shape the future `StorefrontSection`
model slots into.

**1.4 is the hardest screen in the storefront.** Resolve a size+colour choice
to exactly one variant client-side; show out-of-stock combinations disabled
rather than hidden; order sizes by `position`, never alphabetically (that gives
L, M, S, XL). Gallery swap on `images[].variantId` — populated now, but **most
products will be all-`null`**, so the fallback is the common path.

**1.3** — `facets.categories` returns `{ categoryId, count }` and needs joining
against `GET /categories` for labels. `facets.brands` is display-ready. There
is **no size or colour facet**; scope the sidebar accordingly.

---

## Phase 2 — Cart and guest checkout

The first money path. **COD only** — see [gaps.md](gaps.md) §1.

| # | Task | Size | Endpoint |
|---|---|---|---|
| 2.1 | Cart drawer/page — add, update qty, remove | M | `GET/POST/PATCH/DELETE /cart*` |
| 2.2 | Register + login, with guest-cart merge | M | `POST /auth/register`, `/auth/login` |
| 2.3 | Address book — BD division/district/thana, default | M | `/addresses*` |
| 2.4 | Checkout: quote → place order | L | `POST /checkout/quote`, `/checkout` |
| 2.5 | Order history + detail | M | `GET /orders`, `/orders/:id` |

**2.2** — `POST /auth/register` does **not** return a token. Call login right
after, and send `X-Cart-Session` on that login so the guest cart merges.

**2.4** — always call `/checkout/quote` before `/checkout`; shipping is
computed server-side (free ≥ ৳2,000, else ৳60 Dhaka / ৳120 elsewhere) and
guessing it client-side will disagree.

**Checkout has two distinct stock failures. Do not conflate them.**

- **400** `"Not enough stock for: PANJ-BLK-40"` — the pre-flight check. The
  cart already knows: those lines carry `exceedsStock: true`, so you can show
  this state *before* the customer presses Pay.
- **409** `"… just went out of stock"` — lost a race. Someone else bought the
  last unit between the check and the write. Nothing was charged and no stock
  moved. Refetch the cart and ask the customer to adjust.

The 409 is rare and the one teams forget. Both must leave the cart intact —
the whole order is rejected atomically, never partially placed.

**2.5** — render `item.unitPrice`, never the live variant price. Order lines
are frozen snapshots; joining back to the catalogue rewrites history the moment
the store reprices.

---

## Phase 3 — Admin, catalogue

The admin panel earns its keep here. No SEO, no SSR needed.

| # | Task | Size | Endpoint |
|---|---|---|---|
| 3.1 | Admin shell — login, role gate, nav | M | `POST /auth/login` |
| 3.2 | Products list — search, status/category filter | M | `GET /admin/products` |
| 3.3 | Product editor: basics + options + **variant matrix** | L | `POST /admin/products` |
| 3.4 | Image upload + gallery management | M | `/admin/uploads/product-images`, `/admin/products/:id/images` |
| 3.5 | Categories — tree, cycle-safe re-parenting | M | `/admin/categories*` |
| 3.6 | Brands, collections | M | `/admin/brands*`, `/admin/collections*` |

**3.1** — gate on `role`. A `CUSTOMER` token is technically valid but gets 403
everywhere in `/admin`; reject it at the UI with a clear message rather than
letting the user hit a wall. Use `staff@demo.local` to check that
`TENANT_STAFF` sees no Team nav item — it gets **403 on `/admin/users`**.

**3.3 is the hardest screen in the product.** Generate the variant matrix
client-side as the cartesian product of the declared options — never make the
user hand-enter combinations. Every variant needs exactly one `optionValues`
entry per declared option, in declaration order, or the create 400s.

Give the user **drag-to-reorder on option values**: that order becomes
`position`, which is what shoppers see. Alphabetical is wrong.

**3.4** — three steps, and the file never passes through the API. The common
failure is altering the signed headers on the PUT; see
[06-admin-spec.md](06-admin-spec.md) → *Image upload*. Handle **503** as a
feature flag (storage unconfigured), not an outage.

---

## Phase 4 — Admin, operations

What a store actually does every day. Both of these shipped recently.

| # | Task | Size | Endpoint |
|---|---|---|---|
| 4.1 | Orders list — status tabs with counts, filters, search | M | `GET /admin/orders`, `/admin/orders/counts` |
| 4.2 | Order detail + status transitions | M | `GET`/`PATCH /admin/orders/:id` |
| 4.3 | Team management — **owner only** | M | `/admin/users*` |

**4.2** — the backend enforces a transition matrix; do not reimplement it.
Drive the available buttons from the current status and surface the 400 if a
transition is refused. Two behaviours to reflect in the UI copy: cancelling
**restores stock** unless already shipped, and delivering a COD order
**settles its payment** automatically.

**4.3** — hide the nav item entirely for `TENANT_STAFF` rather than showing a
403. Three lockout rules return 400 and need friendly copy: you cannot change
your own role, cannot deactivate yourself, and cannot remove the last active
owner.

---

## Phase 5 — Polish

| # | Task | Size |
|---|---|---|
| 5.1 | SEO: `metaTitle`/`metaDescription`, OG tags, sitemap | M |
| 5.2 | Image optimisation, lazy loading, sized containers | S |
| 5.3 | Accessibility pass — keyboard, focus, labels | M |
| 5.4 | Error boundaries, retry, offline copy | S |
| 5.5 | Analytics events on the funnel | S |

---

## Do NOT build

These have **no backend**. Stubbing them with fake data creates work that gets
thrown away, and worse, sets expectations with the store owner.

| Screen | Why | Detail |
|---|---|---|
| Admin dashboard / stats | No endpoint | [gaps.md](gaps.md) |
| Customer management | No endpoint | §15 |
| Reviews — read or write | No controller; ratings are defaults | §8 |
| Store settings / branding | No endpoint | §4 |
| Online payment | No gateway wired | §1 |
| Coupon / promo field | No `Coupon` model | §12 |
| Size guide | Not modelled | §13 |
| Flash sale countdowns | Not modelled | §6 |
| Platform console | Zero controllers | §14 |
| Best-sellers shelf | `soldCount` never recomputed | §9 |
| Brand / category image upload | Product images only | §7 |
| Customer order cancellation | No endpoint (staff can cancel) | §2 |

**Suppress star ratings entirely** rather than rendering a meaningless 0 —
`avgRating` and `ratingCount` are never recomputed.

Omit or disable the nav item. Do not ship a page that lies.

---

## Suggested milestones

| Milestone | Phases | Demo |
|---|---|---|
| **M1 — Browsable** | 0, 1 | A shopper can find a product |
| **M2 — Shoppable** | 2 | A shopper can complete a COD order |
| **M3 — Manageable** | 3 | A store owner can list their catalogue |
| **M4 — Operable** | 4 | A store owner can run the store end to end |
| **M5 — Launchable** | 5 + payment | Needs the gateway — see below |

**M5 depends on backend work that does not exist yet.** The bKash/Nagad
integration is the last launch blocker and its sandbox signup takes days. Build
the payment step as a **data-driven radio group** so adding a method later is
configuration, not a rewrite, and expect a redirect-or-iframe flow plus a
callback route.

---

## Before starting each task

1. Re-read the relevant section of [api-contract.md](api-contract.md) — it is
   transcribed from real responses, not the schema.
2. Check [CHANGELOG.md](CHANGELOG.md) for what moved since you last pulled.
3. Hit the endpoint with `curl` once before writing the component. The shapes
   are unusual in places (`optionValues[].optionValue.option.name`), and a
   single real response settles more questions than reading the type.
