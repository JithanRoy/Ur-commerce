# Admin Panel Specification

The tenant's own admin panel. React SPA, fully authenticated, no SEO.

All routes are `@AdminOnly()`: `TENANT_OWNER` or `TENANT_STAFF` of **this**
store. `PLATFORM_OWNER` gets 403 — there is no super-admin mode, by design.

## Screens — and what exists to back them

| Screen | Backend | Status |
|---|---|---|
| Login | `POST /auth/login` | ✅ |
| Dashboard | — | ❌ **no stats endpoint** |
| Products list | `GET /admin/products` | ✅ |
| Product create/edit | `POST /admin/products`, `PATCH /admin/products/:id` | ✅ |
| Variant matrix | `PATCH /admin/products/:id/variants` | ✅ |
| Categories | `GET/POST/PATCH/DELETE /admin/categories` | ✅ |
| Brands | `GET/POST/PATCH/DELETE /admin/brands` | ✅ |
| Collections | `GET/POST/PATCH/DELETE /admin/collections` | ✅ |
| Orders | `GET/PATCH /admin/orders` | ✅ |
| Team / staff | `GET/POST/PATCH/DELETE /admin/users` | ✅ owner only |
| Customers | — | ❌ none |
| Reviews | — | ❌ no controller |
| Settings / branding | — | ❌ none |
| Product images | `POST /admin/uploads/product-images` + `/admin/products/:id/images` | ✅ direct-to-storage upload |
| Brand / category images | — | ❌ URL strings only |

**Build the top group now.** The ❌ rows are documented in
[gaps.md](gaps.md); do not stub them with fake data —
ship the nav item disabled or omit it.

---

## Login

Same endpoint as the storefront, on the store's host. Check `role` in the
response and reject `CUSTOMER` at the UI level with a clear message rather
than letting them in to hit 403s.

On 401, refresh once via `POST /auth/refresh` and retry. Refresh tokens
**rotate** — store the new pair each time. `POST /auth/logout` revokes the
session server-side; the access token still lives up to 15 more minutes, so
clear it locally too.

---

## Products list

`GET /admin/products?page=1&limit=20&search=&status=&categoryId=`

Admin rows come back **as stored**: `tenantId`, foreign keys, timestamps, and
**`costPrice`**. This is a different shape from the storefront projection —
give it its own type, do not reuse the public one.

Columns worth having: thumbnail, name, SKU count, price range
(`minPrice`–`maxPrice`), `totalStock`, status badge, updated at.

Status: `DRAFT` · `ACTIVE` · `ARCHIVED`. **Delete archives** — it never hard-
deletes, because order lines reference variants. Label the button "Archive",
and confirm with "this removes it from the storefront", not "this is
permanent".

---

## Product editor — the hard screen

This is where a naive form breaks. The rule:

> When a product declares `options`, **every variant must carry exactly one
> `optionValues` entry per declared option, in declaration order.**

Two options (Size × Colour) with 3 sizes and 2 colours means **6 variants**,
each with exactly 2 option values. Send a variant with one, or three, and you
get a 400.

### Recommended flow

```
Step 1  Basics      name, slug, description, category, brand, status
Step 2  Options     declare Size (40, 42, 44) and Colour (Black, Navy)
Step 3  Variants    ← GENERATE the 3×2 grid, then fill price/stock/SKU per row
Step 4  Images      upload files (see Image upload below), or paste https URLs
```

**Generate the variant matrix client-side from the declared options** — the
cartesian product. Never make the user hand-enter combinations; that is where
the mismatch error comes from.

```
         Black      Navy
  40   [₹][stk]   [₹][stk]
  42   [₹][stk]   [₹][stk]
  44   [₹][stk]   [₹][stk]
```

Let the user delete rows they do not stock — but every remaining row must be
complete. Offer "apply price to all" and "apply stock to all"; filling 24 cells
by hand is the single worst part of running an apparel store.

### Prices are paisa

Show a taka input, store paisa. Multiply by 100 on submit, divide by 100 on
load. Never round-trip through a float.

`costPrice` is admin-only and drives margin display. It must never reach a
public response — if you ever see it in a storefront payload, that is a
security bug worth reporting.

### Order matters

`position` is assigned server-side **from the order of your arrays** — the
create request has no `position` field. That position is what orders sizes
S → M → L → XL on the storefront, so **give the user drag-to-reorder** and
submit the values in the order they arranged them. Never sort them
alphabetically in this editor: what you send is what shoppers see.

Request shapes for create, verified against a live 201:
`options[].values` is a flat array of strings, `variants[].optionValues` is
likewise flat (one per option, in declaration order), and each entry in
`images[]` carries **either** `url` (an https URL you already host) **or**
`objectKey` (from an upload ticket) — exactly one, plus optional `alt`.

### Errors

| Status | Cause | UI |
|---|---|---|
| 400 | Variant's `optionValues` count ≠ declared options | Point at the offending row |
| 400 | Zero variants | "A product needs at least one variant" |
| 409 | Duplicate slug **in this store** | Inline on the slug field |
| 409 | Duplicate SKU **in this store** | Inline on that variant row |
| 409 | Deleting the last variant | "Archive the product instead" |

Slug and SKU are unique **per store**, not globally — another tenant using the
same SKU is fine.

### Editing

`PATCH /admin/products/:id` handles **scalar fields only** — it deliberately
ignores variants, options and images, because replacing those arrays wholesale
would orphan order lines. Variants have their own endpoints:

- `POST   /admin/products/:id/variants` — add one
- `PATCH  /admin/products/:id/variants` — **bulk**, one transaction; use this
  for the matrix rather than N calls
- `PATCH  /admin/products/:id/variants/:variantId` — update one
- `DELETE /admin/products/:id/variants/:variantId` — refuses the last one

Any variant write recomputes `minPrice`, `maxPrice`, `maxDiscountPct` and
`totalStock`, which drive storefront sorting. Refetch the product after a bulk
save to show the new aggregates.

**Images have their own endpoints** (see Image upload below) — they can be
added, reordered, re-pinned and removed after create.

There is **no options endpoint**, so options can only be set at create time.
Changing a product's option structure after launch is not currently supported;
warn the user at step 2.

---

## Categories

Self-referencing tree. `GET /admin/categories` is flat with counts;
`GET /admin/categories/tree` is nested for the editor.

Re-parenting is **cycle-safe** server-side (you cannot make a category its own
ancestor) — surface the error rather than reimplementing the check.

Delete is **blocked while products reference it**. Offer "move products to…"
before deleting.

## Brands

Flat list with product counts. Delete blocked while referenced.

`logoUrl` is a URL string — **no upload for brands or categories yet**. The
upload flow below covers product images only; brand logos and category images
still take a pasted https URL.

## Collections

Curated product groupings that feed homepage shelves.

`PUT /admin/collections/:id/products` **replaces the membership and its order
wholesale** — send the complete ordered array, not a delta. A drag-to-reorder
list that submits the full list on save is the right shape.

---

## Orders

Staff can now fulfil. Four endpoints:
`GET /admin/orders`, `GET /admin/orders/counts`, `GET /admin/orders/:id`,
`PATCH /admin/orders/:id/status`.

### List

Server-side filters: `status`, `paymentStatus`, `paymentMethod`, `search`
(order number, customer name or phone), and a `placedFrom`/`placedTo` range.
Put them in the URL so a filtered view is shareable.

Rows are **summaries** carrying `_count.items`, not the lines themselves. Do
not fetch detail per row to show a line count — it is already there.

`GET /admin/orders/counts` returns every status including zeroes; use it for
status tiles and tab badges without a second query per tab.

### Detail and fulfilment

`PATCH /admin/orders/:id/status` with `{ status, adminNote?, cancelReason? }`.

**Drive the UI from the transition matrix — do not show buttons that will
400:**

```
PENDING_PAYMENT → CONFIRMED, PROCESSING, CANCELLED
CONFIRMED       → PROCESSING, SHIPPED, CANCELLED
PROCESSING      → SHIPPED, CANCELLED
SHIPPED         → DELIVERED, CANCELLED
DELIVERED       → REFUNDED
CANCELLED, REFUNDED are terminal
```

Encode that map once in the frontend and render only the legal next steps for
the order's current status.

Three server behaviours to surface in the UI:

- **Cancelling restores stock** — but only before the order ships. Once
  `SHIPPED`, the goods are physically gone and stock is not returned. Say so
  in the confirm dialog, and refresh inventory views afterwards.
- **Delivering a cash-on-delivery order marks it `PAID`** in the same
  transaction. Do not build a separate "record payment" step for COD.
- **Timestamps are automatic** — `confirmedAt`, `shippedAt`, `deliveredAt`,
  `cancelledAt`. Render them as a timeline, skipping nulls.

`adminNote` is internal and never shown to the customer — keep it visually
distinct from `customerNote`. Prompt for `cancelReason` on cancel; it is
stored on the order.

Errors: **400** for an illegal transition (message names both statuses),
**400** `"Order is already X"` for a no-op, **404** for another store's order.

Still missing: a refund that actually moves money, partial/per-line
cancellation, and courier or tracking fields.

## Team

`/admin/users` — five routes, **owner only**. A `TENANT_STAFF` token gets 403
here while reaching every other admin screen, so **hide the nav item entirely
for staff** rather than letting them click into a 403.

### List

Server-side `search` (name or email) and `isActive`. Owners sort first.
Customers never appear — they share the table but are filtered out server-side.

### Add a member

`POST /admin/users` with `{ name, email, password, role }`. **There is no
invitation email** — the owner sets an initial password and passes it on.
Make that explicit in the form: label it "temporary password" and show it once
after creation so it can be copied.

`role` is `TENANT_OWNER` or `TENANT_STAFF` only. Explain the difference inline:
staff run the store day to day; owners additionally manage the team.

### Guard the UI against lockout

The API refuses these with a 400, but the button should never be live:

| Situation | UI |
|---|---|
| Own row, role selector | Disabled — "You cannot change your own role" |
| Own row, deactivate | Disabled — "You cannot deactivate your own account" |
| Last active owner | Disable demote and deactivate; tooltip "Promote another owner first" |
| Own row, name/password | **Allowed** — do not disable these |

Compute "last active owner" client-side from the list you already have:
count rows where `role === "TENANT_OWNER" && isActive`.

### Deactivate, don't delete

`DELETE` sets `isActive: false`; the row stays because orders and audit trails
reference the user. Label the button **Deactivate**, and confirm with "they
will no longer be able to sign in" — not "this is permanent". Show inactive
members greyed out with a Reactivate action (`PATCH { isActive: true }`).

A deactivated member gets `401 "Account is disabled"` at login.

### Email is per-store

The same address can hold an account on another store — a separate user with a
separate password. A duplicate within this store is a **409**; show it inline
on the email field.

## Screens with no backend — do not fake them

### Dashboard ❌

No stats endpoint. Do not compute revenue by pulling every order client-side.

### Reviews ❌

The `Review` table exists; there is no controller. Also note `avgRating` and
`ratingCount` are **never recomputed**, so any rating shown today is a default.

### Settings / branding ❌

No tenant settings endpoint. Store name, logo, colours, shipping rates and the
homepage layout are not editable — shipping is a hardcoded pure function, and
homepage sections are hardcoded server-side.

### Image upload ✅

**The file never passes through the API.** It goes straight from the browser to
object storage, and a second call records it. Three steps:

```
1. POST /admin/uploads/product-images   → { objectKey, uploadUrl, requiredHeaders }
2. PUT  <uploadUrl>                     → the raw file, direct to storage
3. POST /admin/products/:id/images      → { objectKey, alt?, variantId? }
```

#### Step 1 — ask for a ticket

```jsonc
// POST /admin/uploads/product-images
{ "fileName": "panjabi-navy-front.png", "contentType": "image/png", "contentLength": 180 }
```

```jsonc
// 201
{
  "success": true,
  "message": "Upload ticket created successfully",
  "data": {
    "objectKey": "tenants/5939d547-.../products/2026/09/0850e555-...-panjabi-navy-front.png",
    "uploadUrl": "https://<storage>/...&X-Amz-Signature=<sig>&X-Amz-SignedHeaders=content-length%3Bcontent-type",
    "expiresAt": "2026-09-22T09:08:35.424Z",
    "requiredHeaders": { "Content-Type": "image/png", "Content-Length": "180" }
  }
}
```

`contentLength` must be the **exact** byte length (`file.size`).

#### Step 2 — upload with EXACTLY the required headers

```ts
await fetch(uploadUrl, {
  method: "PUT",
  headers: requiredHeaders,   // send verbatim — do not add, omit or reorder
  body: file,
});
```

**This is the step that goes wrong.** `Content-Type` and `Content-Length` are
cryptographically signed into the URL, so storage returns **403** if either
differs from what was requested — verified: presigning a 180-byte PNG and then
PUTting a different type, or a larger body, both fail at the edge.

Do **not** send the `Authorization` header here. This is a different origin,
and the signature is the credential.

Also note: `fetch` sets `Content-Length` itself from the body. Passing
`requiredHeaders` straight through works because the values agree; if you
build the headers by hand and get the length wrong, you get a 403 that looks
like an auth problem.

#### Step 3 — attach

```jsonc
// POST /admin/products/:id/images
{ "objectKey": "tenants/5939d547-.../0850e555-...-panjabi-navy-front.png",
  "alt": "Navy panjabi, front view" }
```

```jsonc
// 201
{
  "success": true,
  "message": "Image attached successfully",
  "data": {
    "id": "64c452b4-1ba2-4495-9e37-dd3968450e4c",
    "productId": "b9aa2722-e767-4d89-96a1-a69da86a37a1",
    "variantId": null,
    "url": "https://<cdn>/tenants/5939d547-.../0850e555-...-panjabi-navy-front.png",
    "alt": "Navy panjabi, front view",
    "position": 2
  }
}
```

The backend re-checks what actually landed in storage before writing the row.
Appends to the end of the gallery; `url` is permanent and public.

#### On the create-product form

Run steps 1–2 during the media step, then send the collected keys **with the
product**, so creation stays one call and there is no imageless intermediate
state:

```jsonc
// POST /admin/products
{ "name": "...", "variants": [...],
  "images": [ { "objectKey": "tenants/...", "alt": "Front" } ] }
```

Each entry takes **either** `objectKey` **or** `url`, never both.

#### Managing an existing gallery

| Method | Route | Notes |
|---|---|---|
| `GET` | `/admin/products/:id/images` | ordered by `position` |
| `PUT` | `/admin/products/:id/images/order` | `{ imageIds }` — **every** id, exactly once |
| `PATCH` | `/admin/products/:id/images/:imageId` | `{ alt?, variantId? }`; `variantId: null` unpins |
| `DELETE` | `/admin/products/:id/images/:imageId` | 204 |

Reorder is a **full replacement**. A partial list is rejected with 400 "Send
every image id for this product exactly once", and a repeated id with "Image
ids must not repeat" — both verified. After a drag-and-drop, send the complete
array in its new order.

**`variantId` is how the gallery swaps on colour.** Pin the navy shots to the
navy variant; leave shared shots `null`. The variant must belong to this
product (400 otherwise). The storefront detail payload already exposes it.

#### Constraints and errors

Accepted: **JPEG, PNG, WebP, AVIF**, 1 byte – 10 MB. **SVG is refused** — it
can carry script. Validate client-side too, so the user learns before the
upload rather than after.

| Status | Cause | UI |
|---|---|---|
| 400 | Type not in the allowlist, or size out of range | Reject at file-pick |
| 400 | `objectKey` already attached | Refresh the gallery |
| 400 | `variantId` belongs to another product | Bug — do not surface raw |
| 403 | *(on the PUT)* headers altered or the ticket expired | Re-request a ticket |
| 403 | `objectKey` from another store | Bug — do not surface raw |
| 404 | Attached before the PUT finished | Await the PUT, then attach |
| 503 | Storage not configured on that server | "Image upload is unavailable" |

**Handle 503 explicitly.** A server without storage credentials boots fine and
serves everything else, so this is a normal state in a fresh environment, not
an outage.

An upload that is never attached is swept automatically after 48 hours, so an
abandoned form leaks nothing.

---

## Cross-cutting

**Tenant scoping is automatic.** Never send a tenant id; the host resolves it.
A 403 *"This resource belongs to another store"* means the admin panel is
served on a host that does not match the token's store.

**Every list is paginated** — flat `items` / `page` / `limit` / `total` /
`totalPages`, `limit` capped at 100. Server-side pagination everywhere; do not
fetch-all-and-filter.

**Optimistic updates are risky here.** Product writes recompute aggregates
server-side, so the response is authoritative. Prefer invalidate-and-refetch
over optimistic patching for anything touching variants.
