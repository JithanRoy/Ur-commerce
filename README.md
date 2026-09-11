# Ur-commerce

Frontend monorepo for Ur-commerce, a multi-tenant e-commerce SaaS. The NestJS
backend is complete and runs separately; this repo builds against it.

## Structure

```
urcommerce/
├── apps/
│   ├── storefront/     Next.js 15 App Router — the customer shop
│   └── admin/          Vite + React 19 SPA — the tenant admin panel (planned)
└── packages/
    ├── api-client/     fetch wrapper + generated OpenAPI types (planned)
    └── types/          shared domain types (planned)
```

## Stack

pnpm workspaces · Turborepo · TypeScript strict · Next.js 15 · React 19 ·
Tailwind CSS 4 · shadcn/ui · TanStack Query · React Hook Form · Zod · Zustand

## Getting started

```bash
pnpm install
pnpm dev
```

Storefront on `http://localhost:3000`, admin on `http://localhost:5173`. The
backend must be running separately on `http://localhost:3002`.

See **[RUNNING.md](RUNNING.md)** for ports, env files, theming and
troubleshooting.

## Documentation

`docs/frontend/` is the binding contract — endpoint shapes, conventions and
invariants, written from the running API. Start with
[docs/frontend/README.md](docs/frontend/README.md).

`CLAUDE.md` condenses the invariants that matter most: the response envelope,
integer-paisa money, hostname-based tenancy, per-store tokens, and
variant-level pricing.
