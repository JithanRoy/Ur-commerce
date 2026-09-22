# Frontend Architecture

## Decision: build two apps now, a third much later

The backend exposes three API surfaces. That does **not** mean three frontends
on day one.

| App | Build when | Stack | Why separate |
|---|---|---|---|
| **Storefront** | Now | Next.js (App Router, SSR/ISR) | Needs SEO, server rendering, per-tenant domains. Public, unauthenticated by default. |
| **Admin panel** | Now | React SPA (Vite) or Next.js in SPA mode | Behind a login. No SEO. Heavy forms and data grids. |
| **Platform console** | Later — **no endpoints exist yet** | Anything | Our internal SaaS control panel: create tenants, suspend stores, billing. |

### Why the storefront and admin cannot be one app

They differ on every axis that drives a frontend decision:

- **Rendering.** A product page must be server-rendered for Google. An admin
  variant matrix must not be — it is pure client state.
- **Bundle.** Shipping a rich-text editor, chart library and data grid to every
  shopper is a real conversion cost on Bangladeshi mobile networks.
- **Auth posture.** The storefront works signed-out; the admin panel is 100%
  authenticated.
- **Deploy cadence.** Admin ships daily during build-out; the storefront is
  cached at the edge and shipped carefully.
- **Blast radius.** A bug in the admin bundle must never take down the shop.

They share a **package**, not an app — see below.

### Why the platform console is deferred

Nothing to build against. `RoutePrefix.PLATFORM` is defined and
`@PlatformOnly()` exists, but **there are no platform controllers** — zero
endpoints. Tenants are created today by the `npm run db:seed-tenant` script.

Note this deliberate design, because it shapes the console when it is built:
`PLATFORM_OWNER` is **not** a master key. It is rejected by `@AdminOnly()`,
and because login looks up `(tenantId, email)` and platform users have
`tenantId = null`, a platform owner **cannot even log in through a store's
domain**. The console will need its own login on a tenant-less host, and to
act inside a store it must mint a short-lived, audited impersonation token —
not reuse the platform identity.

**Do not design the admin panel expecting a "super admin" god mode.** It does
not exist and removing it was deliberate.

## Recommended repository layout

A monorepo, because the two apps share types that must never drift:

```
frontend/
├── apps/
│   ├── storefront/          Next.js — the customer shop
│   └── admin/               React SPA — the tenant admin panel
└── packages/
    ├── api-client/          Generated from /api/docs-json + a fetch wrapper
    ├── types/               Shared domain types (Product, Order, Money…)
    └── ui/                  Buttons, inputs, modals — only if genuinely shared
```

`packages/api-client` is the important one. It owns:

- unwrapping the `{ success, message, data }` envelope
- attaching the `Authorization` header
- attaching `X-Tenant-Host` in development
- attaching `X-Cart-Session` for guests
- turning a non-2xx body into a typed error

Every other package stays dumb. If a component ever reads `response.data.data`,
the client wrapper has failed.

**Resist over-sharing `packages/ui`.** The storefront is a branded consumer
experience; the admin is a dense tool. A shared `<Button>` that must serve both
becomes a prop-soup component. Share primitives (money formatting, date
formatting, the API client) freely; share visual components only when the
second real use case appears.

## Multi-tenant routing in the storefront

One deployment serves every store. The tenant comes from the **hostname**, and
the backend resolves it before your code runs — custom domain first, then
`<subdomain>.…`.

```
demo.yourdomain.com      → tenant "demo"
shop.aarong.com.bd       → tenant with that custom domain
```

In Next.js, read the host in middleware or a server component and pass it down.
You never send a tenant id — the backend derives it. In **local development
only**, set the `X-Tenant-Host` header because browsers cannot set `Host`; see
[conventions.md](conventions.md).

## Admin panel hosting

Serve it on a subdomain of the store it administers, e.g.
`admin.demo.yourdomain.com`, or a path on the same host. Either way the request
must reach the backend with a host that resolves to that tenant — the admin
JWT is tenant-scoped and `TenantScopeGuard` rejects a mismatch with
*"This resource belongs to another store"*.

A single admin build serves all tenants. Branding comes from the API, not from
a per-tenant build.

## Suggested stack

Opinionated defaults; substitute freely, but keep the shape.

| Concern | Storefront | Admin |
|---|---|---|
| Framework | Next.js 15 App Router | Vite + React 19 |
| Data fetching | RSC + TanStack Query for client islands | TanStack Query |
| Forms | React Hook Form + Zod | React Hook Form + Zod |
| Styling | Tailwind | Tailwind |
| State | URL params for filters; Query cache for the rest | Query cache |
| Tables | — | TanStack Table (the variant matrix needs it) |

Put the `/shop` filter state in the **URL**, not React state. Filters are
shareable, back-button-navigable and SSR-able only if they live in the query
string — and the API's filter params map onto it one-to-one.
