# Ur-commerce — frontend

Frontend monorepo for Ur-commerce, a multi-tenant e-commerce SaaS: one
backend runs many independent, separately branded shops. The NestJS API lives
in its own repo; this repo holds the three apps that use it.

| App                   | What it is                                                            | Local URL             |
| --------------------- | --------------------------------------------------------------------- | --------------------- |
| `apps/storefront`     | The shop customers use (Next.js 15)                                   | http://localhost:3100 |
| `apps/admin`          | A shop's admin panel for its owner and staff (Vite + React 19)        | http://localhost:5273 |
| `apps/platform`       | The operator console that creates and manages shops (Vite + React 19) | http://localhost:5373 |
| `packages/api-client` | Typed API client and domain types shared by all three                 | —                     |

Stack: pnpm workspaces · Turborepo · TypeScript strict · Tailwind CSS 4 ·
TanStack Query · React Hook Form · Zod · Zustand.

## Quick start

```bash
pnpm install
pnpm dev        # starts all three apps; start the API on :3002 first
```

To open another shop locally, use its subdomain:
`http://<shop>.localhost:3100` and `http://<shop>.localhost:5273`.

If `pnpm dev` exits immediately, an old dev server still holds a port: run
`pnpm dev:clean`.

**Local sign-ins** come from the backend's seed scripts, not from this repo:

- Demo shop admin: `admin@demo.local` / `password123` (seed defaults; change
  with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` when seeding).
- Platform console: there is no sign-up. Create the owner in the backend with
  `PLATFORM_OWNER_EMAIL=… PLATFORM_OWNER_PASSWORD=… npm run db:seed-platform`.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter @urcommerce/<app> e2e   # Playwright, against the running apps and API
```

## Documentation

- **[AGENTS.md](AGENTS.md)** — start here. Project map, the rules that bite,
  how to make common changes, hosting. Written for developers and every AI
  coding tool; `CLAUDE.md` and `GEMINI.md` import it.
- [RUNNING.md](RUNNING.md) — env files, theming, troubleshooting.
- [docs/](docs/) — data fetching, UI components, backend sync log, requests
  to the backend, and the original API handoff in
  [docs/frontend/](docs/frontend/README.md).
