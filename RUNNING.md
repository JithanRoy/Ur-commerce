# Running the apps

## TL;DR

```bash
cd /home/technonext/Projects/Frontend-dev/Ur-commerce
pnpm install     # first time only
pnpm dev         # starts both apps
```

| App | URL | Notes |
|---|---|---|
| Storefront | http://localhost:3000 | Customer shop. Public, no login. |
| Admin | http://localhost:5173 | Redirects to `/login`. |
| Backend | http://localhost:3002 | Must be started separately. |
| Swagger | http://localhost:3002/api/docs | Live API explorer. |

Stop everything with `Ctrl+C`.

## Running one app at a time

```bash
pnpm --filter @urcommerce/storefront dev    # :3000
pnpm --filter @urcommerce/admin dev         # :5173
```

## The backend comes first

Neither app works without it. It lives in a separate repository and must be
running on port 3002:

```bash
curl -s http://localhost:3002/api/v1/health
```

No response means the backend is down — start it in its own repo, then reload.

## What you will see today

**Storefront** renders the full shell — header, hero, footer — and then an
empty-state card reading *"The shelves are still being stocked."* That is
correct: the `demo` store has no products yet. Once a catalogue exists, the
homepage sections appear in place of that card.

If it instead says *"We could not load the store"*, the backend is unreachable.

**Admin** opens the login form. Validation, error handling and the route guard
all work. Signing in does not yet succeed — the credentials in
`docs/frontend/07-getting-started.md` (`admin@demo.com` / `password123`) are
rejected by the running backend. Real credentials are still needed.

## Checks

```bash
pnpm typecheck     # all packages
pnpm build         # production build of both apps
pnpm format        # prettier
```

## Environment

Each app reads a local env file, already created and git-ignored.

`apps/storefront/.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
NEXT_PUBLIC_DEV_TENANT_HOST=demo.localhost
```

`apps/admin/.env.local`

```
VITE_API_URL=http://localhost:3002/api/v1
VITE_DEV_TENANT_HOST=demo.localhost
```

`X-Tenant-Host` is sent in development only — a browser cannot set `Host`, and
the backend resolves the store from it. It is ignored in production.

To point an app at a different store, change the tenant host and restart.

## Theming the storefront

The whole palette derives from two values in
`apps/storefront/src/app/globals.css`:

```css
--brand-hue: 24;      /* 0–360 */
--brand-chroma: 0.13; /* 0 = grey, 0.2 = vivid */
```

Change the hue and every colour shifts together. Try `210` for blue, `150` for
green, `340` for pink. This is the seam the branding API will drive when it
exists — `apps/storefront/src/lib/theme.ts`.

## Troubleshooting

**Port already in use** — something is still running:

```bash
fuser -k 3000/tcp    # storefront
fuser -k 5173/tcp    # admin
```

**Types not resolving across packages** — `packages/api-client` is consumed as
source, so a stale install is usually the cause:

```bash
pnpm install
```

**Storefront shows stale content** — the homepage is cached for 60 seconds
(`export const revalidate = 60`). Wait, or restart the dev server.

**Tailwind classes doing nothing** — Tailwind 4 has no `tailwind.config.ts`.
Theme tokens live in `globals.css` under `@theme inline`.

## Layout

```
urcommerce/
├── apps/
│   ├── storefront/   Next.js 15 App Router
│   └── admin/        Vite + React 19 SPA
├── packages/
│   └── api-client/   envelope, headers, typed errors, money
└── docs/frontend/    the API contract — read before building
```
