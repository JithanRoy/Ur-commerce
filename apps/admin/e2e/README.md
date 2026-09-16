# Admin routing checks

Guard behaviour that unit tests cannot reach: real navigation, real
localStorage, real `/auth/me` calls.

Both apps and the backend must be running (`pnpm dev`).

```bash
pnpm --filter @urcommerce/admin e2e
```

`routing.mjs` — every protected URL redirects to `/login` when signed out, an
unknown URL shows a 404 instead of a silent redirect, and `/login` bounces a
signed-in user to the panel.

`session-rejection.mjs` — a forged or expired token in localStorage is rejected
by the server and cleared, and never renders the panel. This is the case that
caught an infinite `/auth/me` redirect loop.
