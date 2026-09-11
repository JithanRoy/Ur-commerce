# Ur-commerce — Frontend

Frontend monorepo for Ur-commerce, a multi-tenant e-commerce SaaS. The NestJS
backend is complete and running; this repo builds against it.

**The backend source is not in this repo.** The binding contract is
`docs/frontend/`. Where this file and those docs disagree, the docs win — and
say so rather than guessing.

## Read before writing code

| Order | Doc | What it settles |
|---|---|---|
| 1 | `docs/frontend/README.md` | The 60-second version |
| 2 | `docs/frontend/03-conventions.md` | The invariants. Non-negotiable. |
| 3 | `docs/frontend/02-api-contract.md` | Real endpoint shapes |
| 4 | `docs/frontend/01-architecture.md` | Why two apps |
| 5 | `docs/frontend/08-backend-gaps.md` | What does NOT exist |

`docs/frontend/00-scaffold-prompt.md` is the brief for the initial scaffold.

## Naming

The product is **Ur-commerce** — hyphen in prose and UI copy. For package
names, directories and npm scopes use `urcommerce`: root `urcommerce`,
`@urcommerce/api-client`, `@urcommerce/types`, `@urcommerce/storefront`,
`@urcommerce/admin`.

**The product name never appears on a customer-facing surface.** Each tenant is
a branded shop of its own; Ur-commerce is the platform underneath.

## The five invariants

1. **Every response is wrapped**: `{ success, message, data }`. Unwrap once, in
   the HTTP client. A component reading `.data.data` means the client failed.
2. **Money is integer paisa.** `189900` is ৳1,899.00. Arithmetic in paisa as
   integers; divide by 100 only at the render boundary. Never `parseFloat` a
   price. `formatBDT` is the only place division happens.
3. **The store comes from the hostname.** Never send a tenant id — the backend
   resolves it from `Host`. In development only, send
   `X-Tenant-Host: demo.localhost`; it is ignored in production.
4. **A JWT is valid for exactly one store.** A token from store A gets 403 on
   store B. There is no cross-store session and no "switch store".
5. **Price and stock live on the variant, not the product.** The cart takes a
   `variantId`, never a `productId`. `minPrice`/`maxPrice` are card aggregates
   ("from ৳1,899"), never a buy button.

Two more that bite:

- **Sort options by `position`, never alphabetically.** Alphabetical gives
  `L, M, S, XL`.
- **Order lines are snapshots.** Render `item.unitPrice`; never join back to
  the live variant. Render `order.shippingAddress` (the JSON snapshot), not
  `order.address`.

## Types that must NOT be shared

These look similar and are not. Sharing one causes `undefined` deep in a
component. Name them distinctly:

| Type | Shape |
|---|---|
| `AdminProduct` | As stored — `tenantId`, FKs, timestamps, `costPrice`, raw `optionValues` join |
| `ProductCard` | Trimmed; `images` capped at 1; no `costPrice` |
| `ProductDetail` | Nested: `optionValues[].optionValue.option.name` |
| `CartLine` | Flattened and pre-sorted: `options[] = { name, value }` |
| `OrderItem` | Snapshot strings; `variantId` nullable; no live relation |

`costPrice` must never reach a public surface. If you see it in a storefront
response, that is a security bug — report it, do not work around it.

Pagination is flat: `{ items, page, limit, total, totalPages }`. There is no
`meta` wrapper. `limit` is capped at 100.

## Do NOT build these

No backend exists for them. Do not mock them, do not stub screens for them.
See `docs/frontend/08-backend-gaps.md`.

- Admin orders (list, view, status change, refund) — staff cannot fulfil
- Admin dashboard, customer management, settings/branding, image upload
- Reviews and star ratings — `avgRating` is never recomputed; suppress ratings
  entirely rather than render a stale 0
- Online payment — COD only; build the payment step as a data-driven radio
  group so a gateway is configuration later
- Order cancellation, coupons/promo codes, refresh-token flow
- "Best sellers" sort — `soldCount` is never recomputed, order is arbitrary
- Size/colour facets — `/products/facets` returns categories and brands only
- Platform console — zero endpoints exist

Build the 401 interceptor now (treat 401 as session-over → clear → redirect),
but no refresh interceptor: nothing consumes the refresh token yet.

## Known blocker — CORS (unresolved as of 2026-09-11)

The backend's `src/main.ts` sets
`allowedHeaders: ["Content-Type", "Authorization"]`, omitting
`X-Cart-Session` and `X-Tenant-Host`. The browser preflight rejects both, so
guest carts and the dev tenant override fail in a browser while curl works
fine. Verified still unfixed.

One-line fix, in the backend repo:

```ts
allowedHeaders: ["Content-Type", "Authorization", "X-Cart-Session", "X-Tenant-Host"],
```

## Environment

| | |
|---|---|
| API | `http://localhost:3002/api/v1` |
| Swagger | `http://localhost:3002/api/docs` |
| OpenAPI JSON | `http://localhost:3002/api/docs-json` |
| Dev store | `demo.localhost` — send as `X-Tenant-Host` in development |

The seeded `demo` store currently returns `sections: []` from `GET /home`. The
empty-array case is the default path, not an afterthought. Render sections by
`type` in array order and ignore unknown types — never index by position.

Verify against a live response, not against the docs or a schema:

```bash
curl -s http://localhost:3002/api/v1/home -H 'X-Tenant-Host: demo.localhost' | jq
```

## Stack

pnpm workspaces + Turborepo. TypeScript strict everywhere, no `any`.

```
urcommerce/
├── apps/
│   ├── storefront/     Next.js 15 App Router — the customer shop
│   └── admin/          Vite + React 19 SPA — the tenant admin panel
└── packages/
    ├── api-client/     fetch wrapper + generated OpenAPI types
    └── types/          shared domain types
```

Tailwind, TanStack Query, React Hook Form + Zod in both apps. TanStack Table in
admin. Storefront filter state lives in the URL query string, not React state.

Resist a shared `packages/ui` until a second real use case appears. The
storefront is a branded consumer experience; the admin is a dense tool.

## Code style

- **Do not add explanatory comments.** Express intent through naming and
  structure; if a block seems to need a comment, extract a named function.
- 2-space indent, double quotes, semicolons, trailing commas.
- TypeScript strict. No `any`.
