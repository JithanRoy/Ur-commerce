# AGENTS.md — Ur-commerce frontend

The single entry point for any AI coding tool (Claude Code, Codex, Cursor,
Copilot, Gemini, …) and for new developers. Read this file first; it links to
everything else. `CLAUDE.md` and `GEMINI.md` only import it.

## What this is

Ur-commerce is a **multi-tenant e-commerce SaaS** for shops in Bangladesh.
One backend serves many independent shops; each shop has its own address,
branding, catalogue, customers and staff. This repo is the **frontend only**:
three apps and one shared package, built against a separate NestJS API.

| Who                      | Uses                                                       | App               |
| ------------------------ | ---------------------------------------------------------- | ----------------- |
| Shoppers                 | Browse, cart, checkout (cash on delivery), orders, reviews | `apps/storefront` |
| A shop's owner and staff | Products, orders, reviews, homepage, branding, team        | `apps/admin`      |
| The platform operator    | Create, edit, suspend shops; reset shop staff passwords    | `apps/platform`   |

**Naming.** The product is **Ur-commerce** (hyphen) in prose; `urcommerce` in
package names (`@urcommerce/storefront`, `@urcommerce/api-client`). The
product name **never** appears on a shopper-facing page: every shop is its own
brand.

## Repository map

```
Ur-commerce/
├── AGENTS.md                 ← you are here
├── CLAUDE.md, GEMINI.md      import this file for those tools
├── README.md                 human quick start
├── RUNNING.md                running locally, env files, troubleshooting
├── turbo.json                build/dev/lint/typecheck tasks
├── apps/
│   ├── storefront/           Next.js 15 App Router, port 3100
│   ├── admin/                Vite + React 19 SPA, port 5273
│   └── platform/             Vite + React 19 SPA, port 5373
├── packages/
│   └── api-client/           typed fetch client, endpoints, domain types (TS source, no build step)
└── docs/                     see "Documentation index" below
```

### `packages/api-client` — the only way to talk to the API

| File                                                                                    | Holds                                                                                                                                |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `client.ts`                                                                             | `createApiClient`: unwraps the `{ success, message, data }` envelope, adds auth/cart/tenant headers, refreshes the token once on 401 |
| `errors.ts`                                                                             | `ApiError` with `isValidation`, `isUnauthenticated`, `isWrongStoreOrForbidden`, `isNotFound`, `isConflict`                           |
| `money.ts`                                                                              | `formatBDT`, `takaToPaisa`, `paisaToTakaInput` — the only place paisa is divided                                                     |
| `storefront/`, `cart/`, `auth.ts`, `profile.ts`, `reviews.ts`, `hero.ts`, `sections.ts` | Shopper-side endpoints and types                                                                                                     |
| `admin/`                                                                                | Store-admin endpoints and types (`AdminProduct`, orders, taxonomy, users, uploads)                                                   |
| `platform.ts`                                                                           | Platform console endpoints, store statuses and allowed transitions                                                                   |
| `dev-host.ts`                                                                           | `localStoreHost` — picks the shop from a `*.localhost` address in development                                                        |
| `forward.ts`                                                                            | `forwardToApi`, `apiTargetUrl` — server-side pass-through used by the storefront's `/api/v1` route                                   |
| `index.ts`                                                                              | Public exports; import from `@urcommerce/api-client`, never deep paths                                                               |

### Inside each app

The three apps share one layout, so a change goes to the same place in each:

| Folder                                                    | Holds                                                                                                                               | Rule                                                                                                                        |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/api/`                                                | One file per domain (`products.ts`, `orders.ts`, …) with typed TanStack Query hooks, plus `query-keys.ts` and `use-api-mutation.ts` | **Every** request goes through a hook here. No inline `useQuery`/`useMutation` in components.                               |
| `src/components/ui/`                                      | Buttons, inputs, fields, selects, dialogs, skeletons, spinners                                                                      | Feature code never uses a raw styled `<button>`, `<input>`, `<select>` or `<textarea>`. Catalogue: `docs/ui-components.md`. |
| `src/components/layout/`                                  | App shell, sidebar, top bar                                                                                                         |                                                                                                                             |
| `src/features/<domain>/`                                  | Components for one domain (products, orders, reviews, account, …)                                                                   | Reusable pieces get extracted, not copied.                                                                                  |
| `src/routes/` (admin, platform) / `src/app/` (storefront) | Pages                                                                                                                               | Thin: compose features and hooks.                                                                                           |
| `src/stores/`                                             | Zustand: auth session, cart session                                                                                                 | Client state only; server data lives in TanStack Query.                                                                     |
| `src/lib/`                                                | `api.ts` (client instances), helpers                                                                                                |                                                                                                                             |

App specifics:

- **storefront** — App Router pages in `src/app/` (`shop`, `category`,
  `brand`, `product/[slug]`, `cart`, `checkout`, `order/[orderNumber]`,
  `account/{orders,addresses,reviews}`, `login`, `register`).
  `src/lib/api.ts` is the **server** client (adds the shop's host and the
  internal key); `src/lib/browser-api.ts` is the **browser** client, which
  calls `/api/v1` on the shop's own origin. `src/app/api/v1/[...path]/route.ts`
  forwards those calls to the API. Filter state lives in the URL query
  string. Homepage sections render by `type` in array order; unknown types
  are skipped.
- **admin** — routes in `src/routes/` (products, product-new/edit,
  categories, brands, collections, orders, reviews, hero, sections,
  branding, team, account, login). `api/proxy.ts` is a Vercel function that
  forwards `/api/v1/*` to the API for one shop (`STORE_HOST`). Every mutation
  confirms with a sonner toast; silent success is a bug.
- **platform** — the operator console: login, store list, new store, store
  detail (edit details, owners and staff, status). It spans every shop, so it
  is never folded into the admin. Its session lives in `sessionStorage` and
  ends after the 15-minute access token (no refresh exists for it).

## The rules that bite

Breaking one of these produces bugs that type-checking does not catch.

1. **Every response is wrapped** `{ success, message, data }`. The client
   unwraps it once. A component reading `.data.data` means the client failed.
2. **Money is integer paisa.** `189900` is ৳1,899.00. Do arithmetic in
   integers; divide only at render, through `formatBDT`. Never `parseFloat` a
   price.
3. **The shop comes from the address, never from an id.** The API resolves
   the shop from `Host`. In development the apps send
   `X-Tenant-Host: <shop>.localhost`; in production the frontend servers send
   `X-Tenant-Host` with `X-Internal-Key`.
4. **A sign-in token is valid for exactly one shop.** There is no
   cross-shop session and no "switch shop".
5. **Price and stock live on the variant.** The cart takes a `variantId`.
   `minPrice`/`maxPrice` on a product card are "from ৳…" labels, never a buy
   button.
6. **Sort options by `position`**, never alphabetically (`L, M, S, XL`).
7. **Order lines are snapshots.** Render `item.unitPrice` and
   `order.shippingAddress`; never join back to the live variant or address.
8. **Do not share look-alike types.** `AdminProduct`, `ProductCard`,
   `ProductDetail`, `CartLine` and `OrderItem` differ in shape; using one for
   another gives `undefined` deep in a component.
9. **`costPrice` must never reach a shopper-facing response.** If it does,
   report it as a security bug.
10. **Pagination is flat**: `{ items, page, limit, total, totalPages }`,
    `limit` at most 100.

## What does not exist (do not build or mock)

- Admin sales dashboard and customer management — no endpoints.
- Online payment — cash on delivery only; the payment step is a data-driven
  radio group so a gateway can be added as configuration.
- Shopper order cancellation, coupons, password reset.
- Size and colour filters — `/products/facets` returns categories and brands only.

Check before trusting this list: the backend moves independently. The live
API description is `http://localhost:3002/api/docs-json`. As of 2026-11-05
every documented path except `GET /health` has a call in
`packages/api-client`.

## Running, checking, testing

```bash
pnpm install
pnpm dev          # all three apps; the API must already run on :3002
pnpm typecheck    # every app and package
pnpm lint
pnpm build
pnpm dev:clean    # when a port is still held by an old dev server
```

|                  | URL                                                                         |
| ---------------- | --------------------------------------------------------------------------- |
| Storefront       | `http://localhost:3100`, or `http://<shop>.localhost:3100` for another shop |
| Admin            | `http://localhost:5273`, or `http://<shop>.localhost:5273`                  |
| Platform console | `http://localhost:5373`                                                     |
| API              | `http://localhost:3002/api/v1` (Swagger at `/api/docs`)                     |

In development an unknown `<shop>.localhost` silently shows the demo shop.
A new shop's homepage `sections` can be `[]`; that is a real state to render,
not an error.

Check shapes against a live response, not only against docs or a schema:

```bash
curl -s http://localhost:3002/api/v1/home -H 'X-Tenant-Host: demo.localhost' | jq
```

**End-to-end tests** are plain Playwright scripts in `apps/<app>/e2e/*.mjs`,
run against the real apps and the real API:
`pnpm --filter @urcommerce/<app> e2e`, or `node apps/<app>/e2e/<file>.mjs`
for one. Some consume real stock or need seeded passwords; see
`apps/admin/e2e/README.md`. After any UI change, run the suite for the area
you touched; type-checking alone has missed real bugs here.

## Hosting (Vercel)

One Vercel project per app, Root Directory `apps/<app>`. In production
neither shop app calls the API from the browser: their own servers forward
`/api/v1/*` and add the shop's host and the internal key.

| App        | Forwarder                                                                       | Environment                                      |
| ---------- | ------------------------------------------------------------------------------- | ------------------------------------------------ |
| storefront | `src/app/api/v1/[...path]/route.ts`; shop = the request's own host              | `NEXT_PUBLIC_API_URL`, `INTERNAL_API_KEY`        |
| admin      | `api/proxy.ts` via `vercel.json`; shop = `STORE_HOST` (one shop per deployment) | `VITE_API_URL`, `STORE_HOST`, `INTERNAL_API_KEY` |
| platform   | none (no shop)                                                                  | `VITE_API_URL`                                   |

- `INTERNAL_API_KEY` must equal the API's. A shop matches when its own domain
  equals the host, else when its subdomain equals the host's first label.
- Production builds stop with a clear message when a required variable is
  missing. `turbo.json` passes `STORE_HOST`, `INTERNAL_API_KEY` and `VERCEL`
  through to builds; add new build-time variables there too.
- The admin cannot be hosted as a plain static site: its `/api/v1` only
  exists through the Vercel rewrite.
- The API's `CORS_ALLOWED_ORIGINS` must list the platform console's address.

## How to make common changes

| Task                              | Where                                                                                                                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New or changed endpoint           | Types and call in `packages/api-client/src/…`, export from `index.ts`, then a hook in `apps/<app>/src/api/<domain>.ts` with a key in `query-keys.ts`. Pattern: `docs/data-fetching.md`. |
| New page                          | storefront `src/app/<route>/page.tsx`; admin/platform `src/routes/<name>.tsx` plus its entry in `src/app.tsx`                                                                           |
| New form control or button style  | `src/components/ui/`, documented in `docs/ui-components.md`                                                                                                                             |
| Backend shipped something         | Follow `docs/backend-sync.md`: read the backend commits, check the live API, build, log the commit there                                                                                |
| Something the backend must change | Add it to `docs/backend-requests.md` with a reproduce block                                                                                                                             |

## Code style

- TypeScript strict, no `any`. 2-space indent, double quotes, semicolons,
  trailing commas (Prettier: `pnpm format`).
- **No explanatory comments.** Express intent with names and small functions.
- Match the surrounding code's naming and idioms.
- Storefront: branded consumer experience. Admin: dense tool. No shared UI
  package until a second real use appears.

## Working agreements

- **Do not commit, push or stage** (`git add`) in this repository. The owner
  commits everything. Leave changes in the working tree and suggest a commit
  message. Read-only git is fine.
- **Verify before claiming.** Check against a live API response, run the
  checks and the relevant e2e, and say plainly what was not verified.
- When a doc disagrees with the live API, the live API wins; say so and fix
  the doc.

## Documentation index

| Question                                                    | Read                                                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| How do I run it, and what's in my env files?                | `RUNNING.md`                                                                                                  |
| How is data fetched, cached, prefetched?                    | `docs/data-fetching.md`                                                                                       |
| Which UI components exist and how are they used?            | `docs/ui-components.md`                                                                                       |
| Which backend commit is the frontend built against?         | `docs/backend-sync.md`                                                                                        |
| What are we waiting on from the backend?                    | `docs/backend-requests.md`                                                                                    |
| Why two apps, how do auth and tenancy work, original specs? | `docs/frontend/README.md` (index)                                                                             |
| What does an endpoint return?                               | The live `http://localhost:3002/api/docs-json`; written: `docs/frontend/api-contract.md` (backend-owned copy) |
