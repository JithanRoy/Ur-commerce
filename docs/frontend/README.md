# Frontend Implementation Guide

Everything a frontend team needs to build against this backend. Written from
the actual controllers and services, not from a plan — every route, field and
status code here exists in the running API today.

**Read in this order:**

| Doc | What it answers |
|---|---|
| [01-architecture.md](01-architecture.md) | How many apps do we build, and why |
| [api-contract.md](api-contract.md) † | Every endpoint, request and response shape |
| [conventions.md](conventions.md) † | Envelope, money, tenancy, errors — the rules that bite |
| [04-auth-and-tenancy.md](04-auth-and-tenancy.md) | Login, roles, token scope, guest carts |
| [05-storefront-spec.md](05-storefront-spec.md) | Page-by-page spec for the customer shop |
| [06-admin-spec.md](06-admin-spec.md) | Page-by-page spec for the tenant admin panel |
| [07-getting-started.md](07-getting-started.md) | Run the backend, seed a store, make your first call |
| [08-build-plan.md](08-build-plan.md) | **What to build, in what order** — phases, sizes, milestones |
| [gaps.md](gaps.md) † | What does NOT exist yet — plan around these |
| [CHANGELOG.md](CHANGELOG.md) † | What moved since you last pulled |

† Owned by the **backend** repo (`docs/api/`) and copied here. Re-copy them
when the backend API changes; do not edit them in place, or the two drift.

## The 60-second version

Three API surfaces, two frontend apps (the third is deferred — see
[01-architecture.md](01-architecture.md)):

```
                    ┌─────────────────────────────┐
  Customers    ──▶  │  Storefront  (Next.js SSR)  │ ──▶  /api/v1/*
                    └─────────────────────────────┘
                    ┌─────────────────────────────┐
  Store staff  ──▶  │  Admin panel (React SPA)    │ ──▶  /api/v1/admin/*
                    └─────────────────────────────┘
                    ┌─────────────────────────────┐
  Us (SaaS)    ──▶  │  Platform console  DEFERRED │ ──▶  /api/v1/platform/*
                    └─────────────────────────────┘      (no endpoints yet)
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

| Environment | API | Swagger |
|---|---|---|
| Local | `http://localhost:3002/api/v1` | `http://localhost:3002/api/docs` |
| Local (JSON schema) | — | `http://localhost:3002/api/docs-json` |

Generate a typed client straight from `/api/docs-json` — see
[07-getting-started.md](07-getting-started.md).
