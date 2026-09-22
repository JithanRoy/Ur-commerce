# Scaffold Prompt

Paste the block below into a fresh Claude Code session **in the new frontend
repository**. Copy `docs/` from the backend repo into it first, or
point the session at the backend checkout so it can read those docs.

---

```
Set up the frontend monorepo for Ur-commerce, a multi-tenant e-commerce SaaS.
The NestJS backend is complete and running; I am building the frontend against
it.

Naming: the product is "Ur-commerce". Use the hyphen in prose and UI copy.
For package names, directories and npm scopes use `urcommerce` (no hyphen):
the monorepo root is `urcommerce`, packages are `@urcommerce/api-client` and
`@urcommerce/types`, apps are `@urcommerce/storefront` and
`@urcommerce/admin`. Do not put the product name into anything a store's
customers will see — each tenant is a branded shop of its own, and
Ur-commerce is the platform underneath, not the storefront brand.

## Before writing any code

Read these, in order. They are the contract — everything below assumes you
have read them, and they override any default you would otherwise reach for:

1. docs/README.md
2. docs/conventions.md      ← the invariants. Non-negotiable.
3. docs/api-contract.md     ← real endpoint shapes
4. docs/01-architecture.md  ← why two apps, and the layout
5. docs/gaps.md             ← what does NOT exist

If anything I ask for below contradicts those docs, follow the docs and tell
me.

## Scope — scaffolding only

Build the skeleton, wired end to end, with ONE real vertical slice proving the
plumbing works. Do not build feature screens. Specifically:

BUILD:
- the monorepo and both app shells
- packages/api-client, complete and correct
- packages/types with the response types
- one working page per app that calls the live API

DO NOT BUILD:
- product listing, detail, cart, checkout, admin product editor
- anything in gaps.md (dashboard, reviews, settings, payment gateway)
- a shared UI component library — resist it until a second real use case
  appears

## Structure

  urcommerce/
  ├── apps/
  │   ├── storefront/     Next.js 15 App Router — the customer shop
  │   └── admin/          Vite + React 19 SPA — the tenant admin panel
  └── packages/
      ├── api-client/     fetch wrapper + generated OpenAPI types
      └── types/          shared domain types

Use pnpm workspaces + Turborepo. TypeScript strict everywhere, no `any`.
Tailwind in both apps. TanStack Query in both. React Hook Form + Zod for forms.

## packages/api-client — the important one

This is the seam. Get it right and no other code has to think about the
envelope, headers, money or tenancy. It owns exactly these:

1. Unwrap `{ success, message, data }` → `data`. ONCE, here. If a component
   ever reads `.data.data`, this failed.
2. `Authorization: Bearer <token>` from a pluggable token getter.
3. `X-Tenant-Host` — DEVELOPMENT ONLY, guarded behind an env check. It is
   ignored in production and shipping it signals the wrong thing.
4. `X-Cart-Session` for guest carts, on /cart* and POST /auth/login.
5. A typed ApiError carrying status, message, and errors[] for validation
   failures.
6. 401 → refresh once via POST /auth/refresh, then retry the original
   request. Refresh tokens ROTATE: store the new pair, discard the old. If
   the refresh itself 401s, clear the session and redirect via an injected
   callback. Never retry more than once.

Generate types from the live OpenAPI document:
  npx openapi-typescript http://localhost:3002/api/docs-json -o src/schema.d.ts

Request DTOs generate well. Response shapes often come out as `unknown`
because Nest infers them from Prisma selects — where that happens, hand-write
the type from the real shape in api-contract.md and mark it
hand-maintained.

Also export:
- `type Paisa = number & { __brand: "paisa" }` — a branded type so a taka
  value cannot be passed by accident
- `formatBDT(paisa: Paisa): string` — the ONLY place division by 100 happens
- `type Paginated<T> = { items: T[]; page: number; limit: number;
   total: number; totalPages: number }` — flat, there is no `meta` wrapper

## Types that must NOT be shared

These look similar and are not. Give them distinct names; sharing one causes
bugs that surface as `undefined` deep in a component:

  AdminProduct    as stored — tenantId, FKs, timestamps, costPrice,
                  raw optionValues join
  ProductCard     trimmed; images capped at 1; no costPrice
  ProductDetail   own nested shape: optionValues[].optionValue.option.name
  CartLine        flattened and pre-sorted: options[] = { name, value }
  OrderItem       snapshot strings; no relation to the live variant

## The vertical slice

Storefront — one page at `/`:
  GET /home, render sections by `type` in array order, ignore unknown types,
  handle the empty-array case (a new store returns sections: []). Never index
  by position. This switch is deliberately the shape a future
  StorefrontSection model will slot into.

Admin — one page at `/login` plus a `/products` list:
  POST /auth/login, store the token, check `role` and reject CUSTOMER at the
  UI with a clear message. Then GET /admin/products paginated, showing name,
  price range and stock. Prices are paisa — format, never compute in taka.

Both must work against the live backend. Verify them and show me the output.

## Invariants I will check

- Money is integer paisa. 189900 is ৳1,899.00. Divide by 100 only at render.
- Pagination is flat. No `meta`.
- A token is valid for exactly ONE store; 403 means wrong store.
- Never send a tenant id — the backend resolves it from the hostname.
- costPrice must never appear on a public surface.
- Do NOT add explanatory comments to code. Express intent through naming and
  structure; if a block seems to need a comment, extract a named function.
- 2-space indent, double quotes, semicolons, trailing commas.

## Environment

  Backend   http://localhost:3002/api/v1
  Swagger   http://localhost:3002/api/docs
  Dev store demo.localhost  (send as X-Tenant-Host in development)

Working credentials (already seeded):
  admin@demo.local / password123   on demo.localhost   TENANT_OWNER
  staff@demo.local / password123   on demo.localhost   TENANT_STAFF
  admin@two.local  / password123   on two.localhost    (cross-tenant tests)

## Deliverable

Working scaffold, both apps booting, both slices returning real data from the
live backend. Then tell me:
- what you verified, with the actual output
- anything in the docs that did not match reality
- what I should build first
```

---

## Notes on using this

**Run it in the frontend repo, not the backend.** The backend's `CLAUDE.md`
carries backend conventions that would confuse a frontend scaffold.

**The docs must be reachable.** Copy this folder's `docs/` into the new repo,
plus the three contract docs from the backend's `docs/api/` — see the handoff
README one level up.

**Start the backend first.** The prompt asks for verification against a live
API; without it you get a scaffold that compiles and has never made a request,
which is exactly the thing that hides integration bugs.

After the scaffold lands, switch to the specialist agents — `storefront-ui`,
`admin-ui`, `api-client`, `frontend-reviewer` — for feature work.
