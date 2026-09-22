# API Changelog

What changed in the backend API, newest first. Read this to find out what
moved since you last pulled, without diffing
[api-contract.md](api-contract.md).

**Scope:** only things a client can observe — routes, request and response
shapes, status codes, headers, auth rules. Internal refactors are not listed,
because they should be invisible to you. If an internal change is ever visible
from the outside, that is a bug; report it.

Each entry is tagged:

| Tag | Meaning |
|---|---|
| **Added** | New route or field. Safe to ignore until you want it. |
| **Changed** | Existing behaviour differs. Read it. |
| **Breaking** | Existing client code will stop working. Read it first. |
| **Fixed** | A defect you may have worked around. |

The machine-readable contract is [openapi.json](openapi.json), regenerated
with `npm run docs:openapi`. Generate your API client from that file — a
removed field then becomes a compile error in your repo instead of a runtime
surprise.

---

## 2026-09-22 — Product image upload

**Added** — six routes. The file **never passes through this API**; the browser
uploads it straight to object storage.

| Method | Route |
|---|---|
| `POST` | `/api/v1/admin/uploads/product-images` |
| `GET` | `/api/v1/admin/products/:id/images` |
| `POST` | `/api/v1/admin/products/:id/images` |
| `PUT` | `/api/v1/admin/products/:id/images/order` |
| `PATCH` | `/api/v1/admin/products/:id/images/:imageId` |
| `DELETE` | `/api/v1/admin/products/:id/images/:imageId` |

Ticket → PUT the file to the returned `uploadUrl` → attach the `objectKey`.
Send `requiredHeaders` **verbatim**: `Content-Type` and `Content-Length` are
signed into the URL, so altering either gives **403 from storage**, not from
us. That PUT carries no `Authorization` and returns **no envelope** — keep it
out of your API client's interceptors.

**Added** — `images[]` on `POST /admin/products` now accepts `objectKey` as an
alternative to `url`. Exactly one is required per entry.

**Changed** — `images[].url` on product create is now validated as an **https
URL** (previously any string, including `javascript:`) and capped at 2048
characters. A non-https value that used to be accepted is now a 400.

**Changed** — `ProductImage.variantId` is now actually populated. It was always
in the `GET /products/:slug` payload but universally `null`; admins can now pin
an image to a variant, which is what drives a colour-swap gallery. **Most
products will still be all-`null`**, so keep the fallback.

**Added** — **503** on the upload routes when a server has no storage
configured. Everything else works normally on such a server, so treat it as a
feature flag rather than an outage.

Accepted: JPEG, PNG, WebP, AVIF, 1 byte – 10 MB. **SVG is refused** (400).

---

## 2026-09-16 — Staff management

**Added** — `GET/POST/PATCH/DELETE /api/v1/admin/users[/:id]`

Store owners can manage their team: list staff, create a member with an
initial password, change a role, deactivate and reactivate.

**Owner-only.** These five routes require `TENANT_OWNER`. A `TENANT_STAFF`
token gets **403**, unlike every other `/admin` route which accepts both. Hide
the team screen from staff rather than letting them hit a 403.

Three lockout rules each return **400**, and the UI should pre-empt all three:

- You cannot change your own role.
- You cannot deactivate yourself.
- The last active owner cannot be demoted or deactivated.

Renaming yourself or changing your own password is still allowed.

Notes that shape the UI:

- Customers never appear in this list — it is filtered to
  `TENANT_OWNER`/`TENANT_STAFF`. Do not build a customer list on it; that
  endpoint does not exist yet.
- `DELETE` is a **soft delete** (`isActive: false`), because orders reference
  users. Render it as "Deactivate", not "Delete", and offer reactivation.
- There is no invitation email. The owner sets an initial password and passes
  it on out of band. Surface that password once, clearly, at creation time.
- Deactivating a member does **not** immediately kill their session — their
  access token stays valid for up to 15 minutes. Do not promise instant
  revocation in the UI copy.

---

## 2026-09-14 — Refresh tokens, and real logout

**Added** — `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`

**Changed** — `POST /api/v1/auth/login` now returns a refresh token alongside
the access token.

Access tokens last **15 minutes**; refresh tokens last **7 days**. This is the
change that most affects your API client.

Build the 401 interceptor like this: on a 401, call `/auth/refresh` **once**,
retry the original request, and clear the session only if the refresh itself
401s. Queue concurrent requests behind a single in-flight refresh — firing
several refreshes in parallel will revoke each other's tokens.

**Refresh rotates.** The token you present is revoked and replaced, so you must
store the new one from every refresh response. Replaying a used refresh token
fails. This is deliberate: it makes logout real rather than cosmetic.

Every failure returns the **same** message regardless of cause, so do not
branch on the error text — treat any refresh failure as "session over".

Not yet available: logout-everywhere, device/session listing, and reuse
detection.

---

## 2026-09-12 — Admin order management

**Added** — `GET /api/v1/admin/orders`, `GET /api/v1/admin/orders/counts`,
`GET /api/v1/admin/orders/:id`, `PATCH /api/v1/admin/orders/:id/status`

Staff can list, filter, search, view and progress orders. Filters: status,
payment status, payment method, date range, plus search. `counts` returns
per-status totals **including zeroes**, so you can render every tab without a
second call.

Status transitions are **guarded** — the server rejects illegal moves. Drive
the UI from the transition matrix in
[api-contract.md](api-contract.md#patch-adminordersidstatus) and only offer legal next
states, rather than showing every status and handling the rejection.

Two server-side behaviours to reflect in confirmation copy:

- **Cancelling restores stock — but only before the order ships.** From
  `SHIPPED` onward, stock is deliberately not returned.
- **Delivering a cash-on-delivery order settles its payment automatically.**
  The courier collects on handover, so delivery *is* the payment event. Do not
  ask staff to mark a COD order paid separately.

`adminNote` is internal and must never be rendered on a customer-facing
screen. Status timestamps (`confirmedAt`, `shippedAt`, `deliveredAt`,
`cancelledAt`) are stamped by the server — do not send them.

Still missing: refunds that move money, partial or per-line cancellation,
courier and tracking fields, and a customer-facing cancel endpoint. Do not
render a Cancel button on the storefront.

---

## Earlier

For anything before 2026-09-12, see the `✅ Fixed` section of
[gaps.md](gaps.md) and the commit history. This changelog starts here; it was
introduced on 2026-09-16 alongside the committed OpenAPI export.
