# Running the apps

## TL;DR

```bash
cd /home/technonext/Projects/Frontend-dev/Ur-commerce
pnpm install     # first time only
pnpm dev         # starts both apps
```

| App | URL | Notes |
|---|---|---|
| Storefront | http://localhost:3100 | Customer shop. Public, no login. |
| Admin | http://localhost:5273 | Redirects to `/login`. |
| Backend | http://localhost:3002 | Must be started separately. |
| Swagger | http://localhost:3002/api/docs | Live API explorer. |

Stop everything with `Ctrl+C`.

## Running one app at a time

```bash
pnpm --filter @urcommerce/storefront dev    # :3100
pnpm --filter @urcommerce/admin dev         # :5273
```

## The backend comes first

Neither app works without it. It lives in a separate repository and must be
running on port 3002:

```bash
cd /home/technonext/Projects/Backend-dev/shopno-puron-ecommerce
npm run start:dev
```

Verify it is up:

```bash
curl -s http://localhost:3002/api/v1/health
```

No response means the backend is down. The storefront will show *"We could not
load the store"* until it is running.

## What you will see today

**Storefront** renders the full shell — header, hero, footer — and then an
empty-state card reading *"The shelves are still being stocked."* That is
correct: the `demo` store has no products yet. Once a catalogue exists, the
homepage sections appear in place of that card.

If it instead says *"We could not load the store"*, the backend is unreachable.

**Admin** opens the login form. Sign in with the seeded store owner:

```
admin@demo.local
password123
```

Note `.local`, not `.com` — earlier revisions of the docs had the wrong TLD.
After signing in you land on `/products`, which lists an empty catalogue until
products exist.

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

**Ports are pinned deliberately.** The storefront uses **3100** and the admin
**5273**, not the framework defaults (3000 / 5173), because other projects on
this machine already use those. If you open 3000 expecting this storefront you
will see a different app entirely.

**"Port already in use", or `pnpm dev` exits immediately** — a dev server from
an earlier session is still holding a port. Clear both and start again:

```bash
pnpm stop      # frees 3100 and 5273
pnpm dev
```

Or in one step:

```bash
pnpm dev:clean
```

**Random 500s, blank pages, or `Cannot find module './823.js'`** — the Next.js
build cache is corrupted, usually after killing the dev server mid-compile.
`pnpm dev:clean` clears it; nothing is lost, the next start just recompiles.

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
