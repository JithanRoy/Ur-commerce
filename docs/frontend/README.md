# Frontend Implementation Guide

The original handoff from the backend team, plus copies of the backend's API
docs. For how **this repo** is organised and the rules for changing it, start
at [`AGENTS.md`](../../AGENTS.md) in the repo root.

**Which file answers what (updated 2026-11-09):**

| Doc                                                                                                                                                                  | Status                               | What it answers                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------- |
| [api-contract.md](api-contract.md) †                                                                                                                                 | Current copy                         | Every endpoint, request and response shape                                              |
| [conventions.md](conventions.md) †                                                                                                                                   | Current copy                         | Envelope, money, tenancy, errors — the rules that bite                                  |
| [gaps.md](gaps.md) †                                                                                                                                                 | Current copy                         | What does NOT exist yet                                                                 |
| [CHANGELOG.md](CHANGELOG.md) †                                                                                                                                       | Current copy                         | What moved in the API, newest first                                                     |
| [openapi.json](openapi.json)                                                                                                                                         | Snapshot of the live API, 2026-11-09 | Machine-readable schema; the live one is `http://localhost:3002/api/docs-json`          |
| [01-architecture.md](01-architecture.md)                                                                                                                             | Original                             | Why separate apps. The platform console it calls deferred now exists (`apps/platform`). |
| [04-auth-and-tenancy.md](04-auth-and-tenancy.md)                                                                                                                     | Original                             | Login, roles, token scope, guest carts                                                  |
| [05-storefront-spec.md](05-storefront-spec.md)                                                                                                                       | Original                             | Page-by-page spec for the shop                                                          |
| [06-admin-spec.md](06-admin-spec.md)                                                                                                                                 | Original                             | Page-by-page spec for the admin panel                                                   |
| [07-getting-started.md](07-getting-started.md)                                                                                                                       | Original                             | Run the backend, seed a store, first call                                               |
| [08-build-plan.md](08-build-plan.md)                                                                                                                                 | Historical                           | The original build order; all phases are built                                          |
| [02-api-contract.md](02-api-contract.md), [03-conventions.md](03-conventions.md), [08-backend-gaps.md](08-backend-gaps.md)                                           | **Superseded**                       | Older frontend-written versions of the † files; read the † files instead                |
| [00-scaffold-prompt.md](00-scaffold-prompt.md), [09-image-uploads-tasks.md](09-image-uploads-tasks.md), [10-image-upload-reference.md](10-image-upload-reference.md) | Historical                           | Briefs for work that is done                                                            |

† Owned by the **backend** repo (`docs/api/`) and copied here. Re-copy them
when the backend API changes; do not edit them in place, or the two drift.
When anything here disagrees with the live API, the live API wins.

## The 60-second version

Three API surfaces, three frontend apps:

```
                    ┌─────────────────────────────┐
  Customers    ──▶  │  Storefront  (Next.js SSR)  │ ──▶  /api/v1/*
                    └─────────────────────────────┘
                    ┌─────────────────────────────┐
  Store staff  ──▶  │  Admin panel (React SPA)    │ ──▶  /api/v1/admin/*
                    └─────────────────────────────┘
                    ┌─────────────────────────────┐
  Us (SaaS)    ──▶  │  Platform console (SPA)     │ ──▶  /api/v1/platform/*
                    └─────────────────────────────┘
```

Five rules that will cost you a day each if you miss them:

1. **Every response is wrapped**: `{ success, message, data }`. Unwrap once in
   the HTTP client, never in components.
2. **Money is integer paisa.** `189900` is ৳1,899.00. Divide by 100 at the
   render boundary only. Never store or compute in taka.
3. **The store is chosen by hostname.** `demo.yourdomain.com` is one store,
   `other.yourdomain.com` is another. In local dev, send `X-Tenant-Host:
demo.localhost`.
4. **A JWT is valid for exactly one store.** A token from store A gets 403 on
   store B. There is no cross-store session.
5. **Price and stock live on the variant, not the product.** You add a
   `variantId` to the cart, never a `productId`.

## Base URLs

| Environment         | API                            | Swagger                               |
| ------------------- | ------------------------------ | ------------------------------------- |
| Local               | `http://localhost:3002/api/v1` | `http://localhost:3002/api/docs`      |
| Local (JSON schema) | —                              | `http://localhost:3002/api/docs-json` |

Generate a typed client straight from `/api/docs-json` — see
[07-getting-started.md](07-getting-started.md).
