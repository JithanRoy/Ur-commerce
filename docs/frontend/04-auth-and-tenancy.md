# Auth & Tenancy

The single most important sentence in this document:

> **A token is valid for exactly one store.**

Everything else follows from that.

## Identity model

`User.email` is unique **per tenant**, not globally. One human shopping at two
stores is **two `User` rows with different ids**. There is no shared identity,
no account linking, no "switch store" menu.

Roles:

| Role | `tenantId` | Can log in via | Reaches |
|---|---|---|---|
| `CUSTOMER` | the store | that store's host | storefront routes |
| `TENANT_STAFF` | the store | that store's host | `/admin/*` |
| `TENANT_OWNER` | the store | that store's host | `/admin/*` |
| `PLATFORM_OWNER` | **`null`** | **no tenant host at all** | `/platform/*` (unbuilt) |

`PLATFORM_OWNER` is deliberately **not** a master key:

- `@AdminOnly()` rejects it. A platform token gets **403** on every `/admin`
  route.
- `TenantScopeGuard` has no role bypass.
- Login looks up `(tenantId, email)`, and platform users have `tenantId = null`,
  so a platform owner **cannot authenticate through a store's domain** — 401.

Do not build a "super admin" mode into the admin panel. It cannot work, and
that is intentional: a guard that exempts a role stops guarding the moment that
role reaches a UI.

## Guard stacks

What the backend runs, so you know what a 403 means:

```
Storefront public   TenantGuard
Storefront cart     TenantGuard → OptionalJwtAuthGuard → CustomerScopeGuard
@CustomerOnly()     JwtAuthGuard → TenantGuard → CustomerScopeGuard
@AdminOnly()        JwtAuthGuard → TenantGuard → RolesGuard → TenantScopeGuard
@PlatformOnly()     JwtAuthGuard → RolesGuard
```

`CustomerScopeGuard` lets **unauthenticated** requests through — that is how
guest carts work — but rejects a token whose `tenantId` differs from the
request's host, with *"Please sign in to this store"*.

`TenantScopeGuard` (admin only) has no such allowance: no token, wrong store,
or no `tenantId` on the token is *"This resource belongs to another store"*.

## Token handling

```jsonc
// POST /auth/login → data
{ "accessToken": "eyJ…", "refreshToken": "eyJ…", "role": "CUSTOMER" }
```

The JWT payload:

```jsonc
{ "sub": "<userId>", "email": "…", "tenantId": "<uuid>", "role": "CUSTOMER" }
```

Send it as `Authorization: Bearer <accessToken>`.

### Storage

Tokens are scoped per-origin. Each store is a different subdomain, so
`localStorage` is naturally isolated — `demo.yourdomain.com` cannot read
`other.yourdomain.com`'s token. That isolation is the browser's, not yours;
do not defeat it by writing to a parent-domain cookie.

For the **storefront**, if you server-render authenticated pages, an
`httpOnly`, `Secure`, `SameSite=Lax` cookie scoped to the exact subdomain is
better than `localStorage` — it survives SSR and resists XSS. For the **admin
SPA**, `localStorage` with an in-memory mirror is acceptable.

### Refresh and logout

`POST /auth/refresh` exchanges a refresh token for a new pair. **It rotates**:
the presented token is revoked and replaced, so store the new pair and discard
the old — replaying a spent token returns 401.

`POST /auth/logout` revokes server-side. The access token remains valid until
it expires (up to 15 minutes) because it is stateless, so clear it locally too.

**Refresh lifetime depends on the role**, and the admin SPA gets the shorter
one:

| Role | Access token | Refresh token |
|---|---|---|
| `CUSTOMER` | 15 minutes | **7 days** |
| `TENANT_OWNER`, `TENANT_STAFF` | 15 minutes | **12 hours** |

A shopper stays signed in for a week; an admin is signed out roughly twice a
day. That is deliberate — an account that can change prices, orders and staff
is a different risk class from a shopper. Do not treat a failed admin refresh
as an error worth surfacing loudly; route to login exactly as for any other
expiry.

### Sign out of all devices

`POST /auth/logout-all` (Bearer token, no body) revokes **every** session for
the signed-in user, including the one making the call:

```jsonc
// 200 data
{ "revokedSessions": 3 }
```

Worth putting in account settings as *"Sign out of all devices"* — show the
count back as *"Signed out of N devices."* It is the only remedy a customer
has if they think their account is compromised, since there is no session
list yet. Same 15-minute caveat: access tokens already issued stay valid
until they expire.

In the client:

- On **401**, refresh once and retry the original request once.
- If the **refresh itself** 401s, the session is over — clear and redirect.
- **Serialise concurrent refreshes.** Three parallel 401s must trigger one
  refresh, not three: the second and third would present an already-rotated
  token and fail, logging the user out mid-session.
- Never attempt a refresh on the refresh call itself.

Not yet: logout-everywhere, and device/session listing.

## Choosing where to land after login

`role` comes back in the login response:

```ts
const { accessToken, role } = await login(email, password);

if (role === "TENANT_OWNER" || role === "TENANT_STAFF") {
  redirect("/admin");
} else {
  redirect(returnTo ?? "/");
}
```

Whether staff and customers share one login **form** is your call — the
backend has one login endpoint per store and sorts by role. A shared form on
the storefront that redirects staff to the admin panel works fine. Just never
assume role from the URL the user arrived at; read it from the response.

## Guest carts and the login merge

A signed-out shopper gets an opaque token you generate:

```ts
function cartSession(): string {
  let token = localStorage.getItem("cart-session");
  if (!token) {
    token = `guest-${crypto.randomUUID()}`;
    localStorage.setItem("cart-session", token);
  }
  return token;
}
```

Send `X-Cart-Session: <token>` on every `/cart*` request **and on
`POST /auth/login`**. On login the backend merges the guest cart into the
customer's, summing quantities and capping at available stock, then deletes the
guest cart.

```ts
await api.post("/auth/login", body, {
  headers: { "X-Cart-Session": cartSession() },
});
localStorage.removeItem("cart-session");   // merged; the token is spent
```

A failed merge never fails the login — you will be authenticated either way.
Refetch `GET /cart` after login rather than trusting local state.

> `X-Cart-Session` and `X-Tenant-Host` are both in the backend's CORS
> `allowedHeaders`, so the preflight passes. (An older note here said
> otherwise — that was fixed.)
>
> ⚠️ **At deploy time**, the API needs `CORS_ALLOWED_ORIGINS` set to your
> storefront and admin origins, comma-separated. It refuses to boot in
> production without it, and an origin not on the list gets no
> `Access-Control-Allow-Origin` header — every call fails in the browser
> while curl still works. Local development is unaffected.

## Tenancy in practice

The store is resolved from the hostname by middleware, before any controller.
You never send a tenant id.

```
Production:  demo.yourdomain.com          → tenant "demo"
             shop.aarong.com.bd           → tenant with that custom domain
Local dev:   header X-Tenant-Host: demo.localhost
```

`X-Tenant-Host` is honoured **only when `NODE_ENV !== "production"`**. In
production it is ignored — otherwise it would let anyone read any store.

A dev-only `DEFAULT_TENANT_ID` fallback makes bare `localhost` resolve to a
store. In production an unknown host is an error, never a default.

## Defence in depth you should know about

The backend has Postgres Row-Level Security policies applied to all
tenant-owned tables, proven fail-closed. **They are not yet enforced at
runtime** (the app connects as a superuser, which bypasses RLS). Application
-level scoping is currently the only thing enforcing isolation — which it does
correctly, and which the guard suite tests.

This does not change anything you build. It is here so you do not assume a
second safety net exists while you are debugging.
