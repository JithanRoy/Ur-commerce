# API Contract

Every endpoint that exists today. Base URL `http://localhost:3002/api/v1`.

All payloads below are the contents of `data` — the `{ success, message, data }`
envelope is omitted for brevity. See
[conventions.md](conventions.md#1-the-response-envelope).

Recent changes are listed in [CHANGELOG.md](CHANGELOG.md). A machine-readable
version of this contract is committed as [openapi.json](openapi.json) —
generate your API client from it rather than hand-writing types.

**Legend** — Auth column:

| Marker | Guards | Meaning |
|---|---|---|
| 🌐 | `TenantGuard` | Public. Tenant resolved from host; no token needed. |
| 🛒 | `TenantGuard` + optional JWT | Public, but personalised if a token is present. |
| 👤 | `@CustomerOnly()` | Signed-in customer of **this** store. |
| 🔐 | `@AdminOnly()` | `TENANT_OWNER` or `TENANT_STAFF` of **this** store. |

---

## Auth

### `POST /auth/register` 🌐

```jsonc
// request
{ "name": "Rafiqul Islam", "email": "rafiq@example.com", "password": "password123" }
```
`name` min 3, `email` valid, `password` min 8.

```jsonc
// 201 data
{
  "id": "…uuid…",
  "name": "Rafiqul Islam",
  "email": "rafiq@example.com",
  "role": "CUSTOMER",
  "createdAt": "2026-09-11T07:22:10.000Z"
}
```
**409** — email already registered *on this store*. The same email may register
on a different store.

Register does **not** log the user in. Call login next.

### `POST /auth/login` 🌐

Optional header: `X-Cart-Session: <guest token>` — merges the guest cart.

```jsonc
// request
{ "email": "rafiq@example.com", "password": "password123" }
```

```jsonc
// 200 data
{ "accessToken": "eyJ…", "refreshToken": "eyJ…", "role": "CUSTOMER" }
```

`role` is one of `CUSTOMER`, `TENANT_STAFF`, `TENANT_OWNER`. Use it to decide
whether to land in the shop or the admin panel.

**401** — bad credentials, or account disabled.

Access tokens live **15 minutes**, refresh tokens **7 days**. Store both; see
`POST /auth/refresh` below.

### `POST /auth/refresh` 🌐

```jsonc
// request
{ "refreshToken": "eyJ…" }

// 200 data — same shape as login
{ "accessToken": "eyJ…", "refreshToken": "eyJ…", "role": "CUSTOMER" }
```

**The presented token is revoked and replaced.** Store the new pair and
discard the old one — replaying a spent token returns 401. That rotation is
what makes a stolen token detectable rather than a silent permanent backdoor.

A token is accepted only if it verifies **and** is still live in the database,
so revocation and logout actually mean something.

**401** — expired, revoked, already rotated, wrong store, disabled account, or
an access token sent by mistake. Every failure returns the same message
(*"Session expired, please sign in again"*) so nothing is leaked about which
check failed. **400** — missing or malformed token.

Refresh on a 401 from any endpoint, then retry once. If the refresh itself
401s, clear the session and send the user to login.

**Refresh lifetime depends on the signed-in role**, and the admin SPA must
expect the shorter one:

| Role | Refresh token lasts |
|---|---|
| `CUSTOMER` | **7 days** |
| `TENANT_OWNER`, `TENANT_STAFF` | **12 hours** |

Access tokens are 15 minutes for everyone. So a shopper stays signed in for a
week, while an admin is signed out roughly twice a day — that is deliberate,
not a bug to work around. Do not treat a failed admin refresh as an error
state worth surfacing loudly; route to login the same way as any other
expiry.

### `POST /auth/logout` 🌐

```jsonc
// request
{ "refreshToken": "eyJ…" }

// 200 data
{ "loggedOut": true }
```

Revokes the token server-side. **The access token stays valid until it
expires — up to 15 minutes** — because it is stateless; clear it client-side
too. Returns 200 even for an unknown or already-revoked token, so logout is
idempotent and never leaves the user stuck.

### `POST /auth/logout-all` 👤(JWT only)

```jsonc
// no request body

// 200 data
{ "revokedSessions": 1 }
```

Revokes **every** refresh token for the signed-in user, including the session
making the call, and returns how many were ended. Requires a Bearer token; no
body. The count is informational — show it as *"Signed out of N devices."*

Use it for a "sign out of all devices" control in account settings. It is the
only remedy available to a customer who thinks their account is compromised,
since there is no session list yet.

Same 15-minute caveat as `logout`: access tokens already issued stay valid
until they expire, because they are stateless.

### `GET /auth/me` 👤(JWT only)

```jsonc
// 200 data
{
  "id": "…uuid…",
  "name": "Rafiqul Islam",
  "email": "rafiq@example.com",
  "phone": "01712345678",
  "dateOfBirth": "1990-05-01T00:00:00.000Z",
  "gender": "MALE",
  "avatarUrl": null,
  "role": "CUSTOMER",
  "tenantId": "…uuid…",
  "createdAt": "2026-09-11T07:22:10.000Z",
  "completion": 100
}
```

`tenantId` is kept for compatibility — it was already published here. New
clients should not depend on it; `GET /profile` omits it.

---

## Storefront — profile

Full guide: [customer-profile.md](customer-profile.md).

### `GET /profile` 👤

```jsonc
// 200 data — a freshly registered account
{
  "id": "b65586cf-d41b-49ad-b424-d3c4c6fda319",
  "name": "Rafiqul Islam",
  "email": "rafiq@example.com",
  "phone": null,
  "dateOfBirth": null,
  "gender": null,
  "avatarUrl": null,
  "role": "CUSTOMER",
  "createdAt": "2026-10-03T10:08:38.992Z",
  "updatedAt": "2026-10-03T10:08:38.992Z",
  "passwordChangedAt": null,
  "completion": 25
}
```

`completion` is 0–100 over `name`/`phone`/`dateOfBirth`/`gender`, derived on
read. `email` is excluded — it is mandatory at registration.

### `PATCH /profile` 👤

Send only what changed: an omitted key keeps its stored value, an explicit
`null` clears it.

```jsonc
// request
{ "phone": "+8801712345678", "dateOfBirth": "1990-05-01", "gender": "MALE" }

// 200 data (abridged)
{ "phone": "01712345678", "dateOfBirth": "1990-05-01T00:00:00.000Z",
  "gender": "MALE", "completion": 100, "updatedAt": "2026-10-03T10:08:46.281Z" }
```

A phone sent as `+880…`, `880…` or a bare subscriber number is **stored and
returned as `01XXXXXXXXX`**. `email` and `role` are rejected with 400.

### `POST /profile/change-password` 👤

```jsonc
// request
{ "currentPassword": "password123", "newPassword": "a-brand-new-one" }

// 200 data
{ "passwordChanged": true, "revokedSessions": 1 }
```

Revokes **every** session including the caller's — treat 200 as a logout.

---

## Storefront — reviews

Full guide: [reviews.md](reviews.md).

| Route | Auth | Returns |
|---|---|---|
| `GET /products/:slug/reviews` | 🌐 | `{ summary: { average, count, distribution }, items, total, page, limit, totalPages }` |
| `GET /reviews/eligibility/:productId` | 👤 | `{ canReview, reason, review }` |
| `GET /reviews/awaiting` | 👤 | delivered products not yet reviewed |
| `GET /reviews/mine` | 👤 | paginated, includes `status` |
| `GET /reviews/summary` | 👤 | `{ awaiting, written }` for the profile |
| `GET /reviews/prompt` | 👤 | `{ prompt: { product, order } \| null }`, read-only |
| `POST /reviews/prompt/:productId/shown` · `/dismiss` | 👤 | record a redirect / "don't ask again" |
| `POST /reviews/uploads` | 👤 | presigned PUT for one photo (5 MB, delivered order required) |
| `POST /reviews` | 👤 | `{ productId, rating 1–5, title?, body? }` → 201 |
| `PATCH /reviews/:id` · `DELETE /reviews/:id` | 👤 author | |
| `GET /admin/reviews` · `PATCH /admin/reviews/:id/status` | staff | moderation |

Public review items: `id, authorName, rating, title, body,
isVerifiedPurchase, createdAt, updatedAt, images[{url, position}]`, with no
user or order id. `POST`/`PATCH /reviews` accept `imageObjectKeys` (max 5;
on PATCH it replaces the set).

`GET /orders` and `GET /orders/:id`: every line carries
`review: { state: NOT_DELIVERED | AVAILABLE | REVIEWED | UNAVAILABLE, … }` and
every order `reviewableCount`.
Only customers with a **DELIVERED** order containing the product may review.
`GET /products?sort=top-rated` orders by `avgRating`, then `ratingCount`.

---

## Storefront — two-step verification

Full guide: [two-step-verification.md](two-step-verification.md).

### `GET /profile/two-factor` 👤

```jsonc
// 200 data
{ "enabled": false, "required": false,
  "enrolmentPending": false, "recoveryCodesRemaining": 0 }
```

`required` is true for `TENANT_OWNER`/`PLATFORM_OWNER`, who cannot turn it off.

### `POST /profile/two-factor/enrol` 👤

```jsonc
// 200 data
{ "secret": "Z2XJZYHQD6HHZDABKCQZE7IPJT6OFJYT",
  "otpauthUri": "otpauth://totp/Demo%20Store:shopper%40demo.local?secret=…",
  "qrCodeDataUrl": "data:image/png;base64,iVBORw0KGgoAAA…" }
```

Does **not** enable anything — `confirm` does.

### `POST /profile/two-factor/confirm` 👤

```jsonc
// request
{ "code": "123456" }

// 200 data
{ "enabled": true,
  "recoveryCodes": ["SMGZ6-E2SUS", "EHRE4-A8X7G", "…10 total…"] }
```

The only time the recovery codes are ever shown; they are stored hashed.

### `POST /profile/two-factor/disable` 👤 · `POST /profile/two-factor/recovery-codes` 👤

Both take `{ "code": "…" }` — a live authenticator code or a recovery code.
A session alone is not enough. Disable returns 400 for a role that requires 2FA.

### `POST /auth/two-factor` 🌐

Once 2FA is on, `POST /auth/login` returns a challenge instead of tokens:

```jsonc
// login 200 data
{ "twoFactorRequired": true, "challengeToken": "eyJhbGciOi…" }
```

The challenge is **not** a session — using it as a Bearer token is 401 on
every route. It lives 5 minutes. Exchange it:

```jsonc
// POST /auth/two-factor
{ "challengeToken": "eyJhbGciOi…", "code": "123456" }

// 200 data
{ "accessToken": "…", "refreshToken": "…", "role": "CUSTOMER" }
```

`code` accepts a 6-digit TOTP code **or** a `XXXXX-XXXXX` recovery code.
Send `X-Cart-Session` here, not on `/auth/login`.

A TOTP code works **once** — replaying it inside its 30-second window is 401.

---

## Storefront — catalogue

### `GET /home` 🌐

The entire homepage in one call. Redis-cached, invalidated on catalogue writes.

```jsonc
// 200 data
{
  "sections": [
    { "type": "CATEGORY_GRID",    "title": "Browse Categories", "categories": [ /* tree */ ] },
    { "type": "PRODUCT_CAROUSEL", "title": "Hot Deals",     "seeAllUrl": "/shop?sort=discount", "products": [ /* cards */ ] },
    { "type": "PRODUCT_CAROUSEL", "title": "New Arrivals",  "seeAllUrl": "/shop?sort=newest",   "products": [ /* cards */ ] },
    { "type": "BRAND_STRIP",      "title": "Shop by Brand", "brands": [ /* brands */ ] }
  ],
  "generatedAt": "2026-09-11T07:22:10.000Z"
}
```

**Render by `type`, in array order. Never index by position.**
A section with nothing to show is **omitted entirely** — a brand-new store
returns `{ "sections": [], "generatedAt": … }`. Ignore unknown `type` values so
new section types can ship without breaking you.

Today the sections are hardcoded server-side. A future `StorefrontSection`
model will make them tenant-editable — your `switch (section.type)` renderer is
exactly the right shape for that.

### `GET /products` 🌐 — the `/shop` grid

ACTIVE products only.

| Param | Type | Notes |
|---|---|---|
| `page`, `limit` | int | default 1 / 20, limit max 100 |
| `category` | string | category **slug** |
| `brands` | string[] | brand **slugs**; repeat the param: `?brands=a&brands=b` |
| `minPrice`, `maxPrice` | int | **paisa** |
| `inStockOnly` | bool | `true` / `false` |
| `search` | string | max 100 chars |
| `sort` | enum | `newest` (default), `best-sellers`, `price-asc`, `price-desc`, `discount` |

```jsonc
// 200 data — a product CARD
{
  "items": [{
    "id": "…uuid…",
    "name": "Classic Cotton Panjabi",
    "slug": "classic-cotton-panjabi",
    "brand": { "id": "…", "name": "Shopno", "slug": "shopno", "logoUrl": "https://…" },
    "minPrice": 189900,
    "maxPrice": 199900,
    "maxDiscountPct": 24,
    "totalStock": 16,
    "avgRating": 4.5,
    "ratingCount": 18,
    "images": [{ "url": "https://…", "alt": "Black cotton panjabi, front view" }],
    "variants": [
      { "id": "…", "sku": "PANJ-BLK-40", "price": 189900, "compareAtPrice": 249900, "currency": "BDT", "stock": 12 }
    ]
  }],
  "page": 1, "limit": 20, "total": 2, "totalPages": 1
}
```

Traps:
- **`images` is capped at 1** on a card (`take: 1`) — it is the thumbnail, not
  the gallery. Use the detail endpoint for all images. An empty array is normal.
- **`brand` is an object or `null`**, never a string. (A legacy string column
  exists in the DB; nothing public reads it.) `brand.slug` feeds straight back
  in as a `?brands=` value.
- `avgRating` / `ratingCount` / `soldCount` are **not yet recomputed** — they
  sit at defaults. Do not build a "Top rated" shelf on them yet;
  `best-sellers` sort currently returns an arbitrary order.
  `minPrice`/`maxPrice`/`maxDiscountPct`/`totalStock` **do** recompute
  correctly, so price and discount sorting work.

### `GET /products/facets` 🌐

Takes the **same params** as `/products`. Counts reflect what remains if each
additional facet were applied.

```jsonc
// 200 data
{
  "categories": [
    { "categoryId": "…uuid…", "count": 14 },
    { "categoryId": null,     "count": 3 }     // uncategorised
  ],
  "brands": [
    { "id": "…", "name": "Shopno", "slug": "shopno", "logoUrl": "https://…", "count": 14 }
  ]
}
```

`brands` rows are display-ready. **`categories` is raw** — resolve `categoryId`
against `GET /categories` to get a label. The `null` row counts uncategorised
products. There is no price-range, size or colour facet yet.

### `GET /products/:slug` 🌐 — detail page

```jsonc
// 200 data
{
  "id": "…", "name": "Classic Cotton Panjabi", "slug": "classic-cotton-panjabi",
  "description": "Full-sleeve cotton panjabi with a mandarin collar.",
  "metaTitle": "Classic Cotton Panjabi — Demo Clothing",
  "metaDescription": "Breathable cotton panjabi for everyday wear.",
  "brand":    { "id": "…", "name": "Shopno", "slug": "shopno", "logoUrl": "https://…" },
  "category": { "id": "…", "name": "Panjabi", "slug": "panjabi" },
  "minPrice": 189900, "maxPrice": 199900, "maxDiscountPct": 24, "totalStock": 16,
  "avgRating": 4.5, "ratingCount": 18,
  "options": [
    { "name": "Size",   "values": [{ "value": "40" }, { "value": "42" }] },
    { "name": "Colour", "values": [{ "value": "Black" }] }
  ],
  "variants": [{
    "id": "…", "sku": "PANJ-BLK-40",
    "price": 189900, "compareAtPrice": 249900, "currency": "BDT", "stock": 12,
    "optionValues": [
      { "optionValue": { "value": "40",    "option": { "name": "Size",   "position": 0 } } },
      { "optionValue": { "value": "Black", "option": { "name": "Colour", "position": 1 } } }
    ]
  }],
  "images": [
    { "url": "https://…", "alt": "…", "position": 0, "variantId": null }
  ]
}
```

- `optionValues` is a **raw nested join** — note the doubled `optionValue` key.
- `images[].variantId` is `null` for gallery-wide images, or a variant id for
  a colour-specific shot. Filter on selection to swap the gallery.
- A variant with `stock: 0` still appears — render it disabled, not hidden.

**404** — no ACTIVE product with this slug in this store.

### `GET /categories` 🌐

Nested tree, ACTIVE-product counts only.

```jsonc
[{
  "id": "…", "name": "Men", "slug": "men",
  "imageUrl": "https://…", "productCount": 34,
  "children": [
    { "id": "…", "name": "Panjabi", "slug": "panjabi", "imageUrl": null, "productCount": 14, "children": [] }
  ]
}]
```

### `GET /brands` 🌐

Ordered by product count descending.

```jsonc
[{ "id": "…", "name": "Aarong", "slug": "aarong", "logoUrl": "https://…", "productCount": 22 }]
```

### `GET /collections` 🌐

Active collections. Curated groupings for homepage shelves.

---

## Storefront — cart

All `/cart` routes accept **either** a customer JWT **or** an
`X-Cart-Session` header. With a JWT the header is ignored.

**Every cart endpoint returns the full cart summary** — no need to refetch.

```jsonc
// the cart summary, returned by ALL /cart routes
{
  "id": "…uuid…",
  "items": [{
    "id": "…line uuid…",
    "quantity": 2,
    "unitPrice": 189900,
    "lineTotal": 379800,
    "currency": "BDT",
    "exceedsStock": false,
    "variant": {
      "id": "…", "sku": "PANJ-BLK-40",
      "price": 189900, "compareAtPrice": 249900, "stock": 12,
      "options": [{ "name": "Size", "value": "40" }, { "name": "Colour", "value": "Black" }]
    },
    "product": {
      "id": "…", "name": "Classic Cotton Panjabi", "slug": "classic-cotton-panjabi",
      "image": { "url": "https://…", "alt": "…" }
    }
  }],
  "itemCount": 2,
  "subtotal": 379800,
  "currency": "BDT",
  "updatedAt": "2026-09-11T07:22:10.000Z"
}
```

`variant.options` is already **sorted by position** and flattened — unlike the
product detail shape. `product.image` is a single object or `null`.

**`exceedsStock`** is computed per line: stock dropped below the cart quantity
since it was added. Show a warning; checkout will reject with 400.

| Method | Route | Notes |
|---|---|---|
| `GET` | `/cart` 🛒 | Creates the cart lazily |
| `POST` | `/cart/items` 🛒 | `{ variantId, quantity }` — 1..100. **Increments** an existing line. 201 |
| `PATCH` | `/cart/items/:itemId` 🛒 | `{ quantity }` — **absolute**, 0..100. `0` removes the line |
| `DELETE` | `/cart/items/:itemId` 🛒 | Remove a line |
| `DELETE` | `/cart` 🛒 | Empty the cart |

Errors: **400** `"Only N unit(s) available for this variant"`,
**400** `"A cart session is required — sign in or send an X-Cart-Session header"`,
**404** `"Product variant is not available"` (missing, other store, or not ACTIVE).

---

## Storefront — addresses 👤

Bangladesh-shaped. All routes require a signed-in customer.

```jsonc
// POST /addresses request
{
  "fullName": "Rafiqul Islam",          // 2–120
  "phone": "01712345678",               // BD mobile: ^(?:\+?880|0)1[3-9]\d{8}$
  "alternatePhone": "01812345678",      // optional, same pattern
  "division": "Dhaka",                  // 2–60
  "district": "Dhaka",                  // 2–60  ← drives shipping cost
  "thana": "Gulshan",                   // 2–60
  "area": "Gulshan 2",                  // optional, ≤120
  "addressLine": "House 42, Road 11",   // 4–255
  "postCode": "1212",                   // optional, ≤10
  "landmark": "Beside Gulshan 2 circle",// optional, ≤160
  "label": "Home",                      // optional, ≤40
  "isDefault": true                     // optional
}
```

| Method | Route | Notes |
|---|---|---|
| `GET` | `/addresses` | Default first, then most recent |
| `GET` | `/addresses/:id` | |
| `POST` | `/addresses` | **The first address saved becomes default automatically** |
| `PATCH` | `/addresses/:id` | All fields optional |
| `DELETE` | `/addresses/:id` | Deleting the default promotes the most recent remaining |
| `PUT` | `/addresses/:id/default` | Clears the previous default in one transaction |

Exactly one default per user, enforced by a database index — you cannot end up
with two.

**`district` determines shipping.** Free at or above ৳2,000 (200000 paisa);
otherwise ৳60 (6000) inside Dhaka, ৳120 (12000) elsewhere.

---

## Storefront — checkout 👤

### `POST /checkout/quote`

Totals **before** committing. Call whenever the selected address changes.

```jsonc
// request
{ "addressId": "…uuid…" }

// 200 data
{
  "subtotal": 379800,
  "shippingTotal": 0,
  "discountTotal": 0,
  "grandTotal": 379800,
  "currency": "BDT",
  "itemCount": 2
}
```

`discountTotal` is always `0` — there is no coupon system yet.

### `POST /checkout`

```jsonc
// request
{
  "addressId": "…uuid…",
  "paymentMethod": "CASH_ON_DELIVERY",   // BKASH | NAGAD | ROCKET | CARD
  "customerNote": "Please deliver after 6pm"   // optional, ≤500
}
```

One transaction: decrements stock, snapshots every line, creates the order and
a payment row, and empties the cart. Returns the full order (shape below).

> ⚠️ **Only `CASH_ON_DELIVERY` actually completes a purchase today.** The
> gateway methods are accepted and leave the order `PENDING_PAYMENT` forever —
> nothing talks to bKash/Nagad yet. Show only COD in the UI until the gateway
> lands. See [gaps.md](gaps.md).

Errors:
- **400** `"Your cart is empty"`
- **400** `"Not enough stock for: PANJ-BLK-40, TEE-S"`
- **404** address not found / not the customer's
- **409** `"\"Classic Cotton Panjabi\" (PANJ-BLK-40) just went out of stock"` —
  someone bought the last unit mid-checkout. **Nothing was charged and no stock
  moved.** Refetch the cart and let the customer adjust.

---

## Storefront — orders 👤

### `GET /orders` — paginated history
### `GET /orders/:id` — one order

Both return the same order shape; the list nests it under `items`.

```jsonc
{
  "id": "…uuid…",
  "orderNumber": "ORD-202609-00001",
  "status": "CONFIRMED",
  "paymentStatus": "PAID",
  "paymentMethod": "CASH_ON_DELIVERY",
  "customerName": "Rafiqul Islam",
  "customerPhone": "01712345678",
  "customerEmail": null,
  "subtotal": 379800,
  "discountTotal": 0,
  "shippingTotal": 0,
  "grandTotal": 379800,
  "currency": "BDT",
  "customerNote": "Please deliver after 6pm",
  "placedAt": "2026-09-11T07:22:10.000Z",
  "confirmedAt": "2026-09-11T07:22:10.000Z",
  "shippedAt": null,
  "deliveredAt": null,
  "cancelledAt": null,
  "cancelReason": null,
  "shippingAddress": { /* JSON SNAPSHOT — render this */ },
  "address": { /* live address-book row — may have been edited since */ },
  "items": [{
    "id": "…",
    "productName": "Classic Cotton Panjabi",
    "variantSku": "PANJ-BLK-40",
    "optionSummary": "Size: 40, Colour: Black",
    "unitPrice": 189900,
    "compareAtPrice": 249900,
    "quantity": 2,
    "lineTotal": 379800,
    "productId": "…",
    "variantId": "…"     // nullable — survives variant deletion
  }]
}
```

**Render `items[].unitPrice` and `shippingAddress`, never the live variant
price or the live address.** See
[conventions.md](conventions.md#8-order-lines-are-snapshots--never-join-back-to-the-catalogue).

Order numbers are per-tenant: `ORD-YYYYMM-NNNNN`.

**Enums**

| Enum | Values |
|---|---|
| `OrderStatus` | `PENDING_PAYMENT`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED` |
| `PaymentStatus` | `PENDING`, `PAID`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED` |
| `PaymentMethod` | `CASH_ON_DELIVERY`, `BKASH`, `NAGAD`, `ROCKET`, `CARD` |

> There is **no customer-facing order cancellation endpoint** and **no admin
> order management endpoint** yet. Orders can be placed and read, not
> progressed. See [gaps.md](gaps.md).

---

## Admin — products 🔐

Admin responses return rows **as stored**: `tenantId`, foreign keys,
timestamps, **`costPrice`**, and `optionValues` as the raw join. This is a
different shape from the storefront projection — do not share a type between
them.

| Method | Route | Notes |
|---|---|---|
| `GET` | `/admin/products` | Paginated; `search`, `status`, `categoryId` filters |
| `GET` | `/admin/products/:id` | Full detail with variants, options, images |
| `POST` | `/admin/products` | Creates product + variants + options + images |
| `PATCH` | `/admin/products/:id` | **Scalar fields only** |
| `DELETE` | `/admin/products/:id` | **Archives** — never hard-deletes |
| `POST` | `/admin/products/:id/variants` | Add one variant |
| `PATCH` | `/admin/products/:id/variants` | **Bulk** — the variant matrix |
| `PATCH` | `/admin/products/:id/variants/:variantId` | Update one |
| `DELETE` | `/admin/products/:id/variants/:variantId` | Refuses the last variant |
| `POST` | `/admin/uploads/product-images` | Presigned upload ticket |
| `GET` | `/admin/products/:id/images` | Ordered by `position` |
| `POST` | `/admin/products/:id/images` | Attach an uploaded object |
| `PUT` | `/admin/products/:id/images/order` | Full ordered replacement |
| `PATCH` | `/admin/products/:id/images/:imageId` | `alt`, `variantId` |
| `DELETE` | `/admin/products/:id/images/:imageId` | 204 |

### The option/variant rule — the one that breaks naive forms

When a product declares `options`, **every variant must carry exactly one
`optionValues` entry per declared option, in declaration order.** Two options
(Size, Colour) with 3 sizes × 2 colours means 6 variants, each with exactly 2
option values.

```jsonc
// POST /admin/products
{
  "name": "Classic Cotton Panjabi",
  "slug": "classic-cotton-panjabi",
  "description": "…",
  "categoryId": "…uuid…",
  "brandId": "…uuid…",
  "status": "ACTIVE",
  "options": [
    { "name": "Size",   "values": ["40", "42"] },
    { "name": "Colour", "values": ["Black"] }
  ],
  "variants": [
    { "sku": "PANJ-BLK-40", "price": 189900, "compareAtPrice": 249900, "costPrice": 120000,
      "stock": 12, "optionValues": ["40", "Black"] },
    { "sku": "PANJ-BLK-42", "price": 199900, "compareAtPrice": 259900, "costPrice": 130000,
      "stock": 4,  "optionValues": ["42", "Black"] }
  ],
  "images": [{ "url": "https://…", "alt": "…" }]
}
```

Note the **request** shapes, verified against a live 201:

- `options[].values` is a **flat array of strings**, not objects. Ordering is
  the array order — there is no `position` field on the request.
- `variants[].optionValues` is likewise a flat array of strings, one per
  declared option, in declaration order.
- `images[]` entries take **either** `url` (an https URL you already host)
  **or** `objectKey` (from an upload ticket) — exactly one, plus optional
  `alt`. No `position` on create; it comes from the array order.

  The create path trusts an `objectKey` that was validated when its ticket was
  issued, and does **not** re-HEAD it — doing N storage round trips inside the
  request's database transaction is what the whole upload design avoids.
  `POST /admin/products/:id/images` is the strict path.
- Optional variant fields: `costPrice`, `stock`, `lowStockThreshold`,
  `barcode`, `weight`.
- `slug` must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

Responses **do** carry `position` on options and images — it is assigned
server-side from the array order.

Check the live Swagger examples (`/api/docs`, "Admin · Products" → POST) for
the exact field names — they are verified to return 201 against a running
server. **Swagger's auto-generated body is unusable** for a product with
options: it builds a single placeholder variant and fails this check.

Errors: **400** option-value mismatch, **400** zero variants,
**409** duplicate slug, **409** duplicate SKU *in this store*,
**409** deleting the last variant.

Archive, never delete: order lines reference variants.

## Admin — product images 🔐

**The file never passes through this API.** The browser uploads it straight to
object storage against a presigned URL; two short API calls bracket that.

### `POST /admin/uploads/product-images`

```jsonc
// request
{ "fileName": "panjabi-navy-front.png", "contentType": "image/png", "contentLength": 180 }
```

```jsonc
// 201 — captured from a live server
{
  "success": true,
  "message": "Upload ticket created successfully",
  "data": {
    "objectKey": "tenants/5939d547-2e6b-474f-a696-47d8b8d2a68a/products/2026/09/0850e555-8324-4a7a-bf61-c78c01a45171-panjabi-navy-front.png",
    "uploadUrl": "https://<storage-host>/<bucket>/<objectKey>?X-Amz-Algorithm=AWS4-HMAC-SHA256&…&X-Amz-Signature=<sig>&X-Amz-SignedHeaders=content-length%3Bcontent-type",
    "expiresAt": "2026-09-22T09:08:35.424Z",
    "requiredHeaders": { "Content-Type": "image/png", "Content-Length": "180" }
  }
}
```

`contentType` must be one of `image/jpeg`, `image/png`, `image/webp`,
`image/avif` — **`image/svg+xml` is refused** (400), because SVG can carry
script. `contentLength` is the exact byte count, 1 byte to 10 MB.

`fileName` is used only for a readable suffix on the key: directory components
are stripped and the extension comes from `contentType`, never the filename.

**503** if the server has no storage configured. That is a normal state in a
fresh environment — the rest of the API works — so handle it distinctly from
an outage.

### The upload itself — not this API

```http
PUT <uploadUrl>
Content-Type: image/png
Content-Length: 180

<raw bytes>
```

Send `requiredHeaders` **verbatim**. Both are signed into the URL, so storage
returns **403** if either differs — verified by presigning a 180-byte PNG and
then attempting a different content type, and a larger body. Both failed at
the edge, before reaching this API.

Do not send `Authorization` or `X-Tenant-Host`; this is a different origin and
the signature is the credential. The response carries **no envelope** — a
failure is S3-style XML.

### `POST /admin/products/:id/images`

```jsonc
// request
{ "objectKey": "tenants/5939d547-…/0850e555-…-panjabi-navy-front.png",
  "alt": "Navy panjabi, front view",
  "variantId": null }
```

```jsonc
// 201 — captured from a live server
{
  "success": true,
  "message": "Image attached successfully",
  "data": {
    "id": "64c452b4-1ba2-4495-9e37-dd3968450e4c",
    "productId": "b9aa2722-e767-4d89-96a1-a69da86a37a1",
    "variantId": null,
    "url": "https://<cdn>/tenants/5939d547-…/0850e555-…-panjabi-navy-front.png",
    "alt": "Navy panjabi, front view",
    "position": 2
  }
}
```

The server HEADs the stored object and re-validates its real type and size
before writing the row — the presign alone would only prove what the client
*claimed*. Appends at the end of the gallery. `objectKey` is internal and is
**not** returned.

| Status | Cause |
|---|---|
| 400 | This `objectKey` is already attached |
| 400 | Stored object is not an allowed type or size |
| 400 | `variantId` belongs to another product |
| 403 | `objectKey` is under another store's prefix |
| 404 | No such product, or the file was never uploaded |

### `GET /admin/products/:id/images`

```jsonc
// 200 — captured from a live server
{
  "success": true,
  "message": "Product images fetched successfully",
  "data": [
    { "id": "54253f6e-924b-4410-8485-da442ed24743",
      "productId": "b9aa2722-e767-4d89-96a1-a69da86a37a1",
      "variantId": null,
      "url": "https://placehold.co/800x1000",
      "alt": null,
      "position": 0 }
  ]
}
```

### `PUT /admin/products/:id/images/order`

`{ "imageIds": ["<id>", "<id>", …] }` — **every** id for this product, exactly
once, in display order. Returns the reordered list.

Partial and duplicated lists are rejected rather than applied, because a stale
client list would silently scramble the gallery:

| Status | Message |
|---|---|
| 400 | `Send every image id for this product exactly once` |
| 400 | `Image ids must not repeat` |

### `PATCH /admin/products/:id/images/:imageId`

`{ "alt"?, "variantId"? }`. Send `"variantId": null` to unpin.

**`variantId` drives the colour-swap gallery** — pin the navy shots to the navy
variant and leave shared shots `null`. The variant must belong to this product
(400 otherwise). `GET /products/:slug` already exposes `variantId` on images.

### `DELETE /admin/products/:id/images/:imageId`

**204.** Removes the row; the stored object is reaped by a separate sweep 48
hours later, so deletion never waits on storage. An upload that is never
attached is collected the same way.

## Store settings — branding

### `GET /store` 🌐 — what the storefront renders with

Public, cached 10 minutes. Fetch once per page load and drive CSS custom
properties from it.

```jsonc
// 200 — captured from a live server
{
  "success": true,
  "message": "Store fetched successfully",
  "data": {
    "storeName": "Ur Clothing",
    "tagline": "Everyday wear, made in Bangladesh",
    "logoUrl": null,
    "faviconUrl": null,
    "currency": "BDT",
    "locale": "en",
    "supportEmail": "help@urclothing.test",
    "supportPhone": "+8801712345678",
    "brandsEnabled": true,
    "theme": {
      "primaryColor": "#0F766E",
      "accentColor": "#F59E0B",
      "onPrimary": "light",
      "onAccent": "dark"
    }
  }
}
```

**`onPrimary` and `onAccent` are derived, not stored.** They are `"light"` or
`"dark"` and say which text colour stays readable on that background at WCAG
AA (4.5:1). A store owner picks a brand colour, not a text colour — amber
`#F59E0B` above gets `"dark"` because white text on it is unreadable. Use
them; do not recompute contrast client-side, and do not assume white always
works.

`storeName` falls back to the internal tenant name until the owner sets a
display name, so it is never null. `tagline`, `logoUrl`, `faviconUrl`,
`supportEmail` and `supportPhone` **are** nullable — render nothing, not an
empty box.

**`brandsEnabled`** is `false` for a single-brand store. When it is false,
hide every brand UI: the brand filter, brand pages, "Shop by Brand" and brand
names on cards. The API already enforces this: `/home` omits `BRAND_STRIP`,
`GET /brands` returns `[]`, `/products/facets` returns `brands: []`, the
`?brands=` filter is ignored, and every product card and detail carries
`brand: null`. Categories are unaffected.

### `GET /admin/settings` 🔐👑 — owner only

Same payload as `GET /store`, uncached.

### `PATCH /admin/settings` 🔐👑 — owner only

**Partial update.** Omitted fields are left alone; send an explicit `null` to
clear an optional one.

```jsonc
// request — every field optional
{
  "displayName": "Ur Clothing",
  "tagline": "Everyday wear, made in Bangladesh",
  "logoUrl": "https://cdn.example.com/logo.png",
  "faviconUrl": "https://cdn.example.com/favicon.png",
  "primaryColor": "#0F766E",
  "accentColor": "#F59E0B",
  "supportEmail": "help@urclothing.test",
  "supportPhone": "+8801712345678",
  "brandsEnabled": false
}
```

Returns the updated settings in the `GET /store` shape, and invalidates the
public cache immediately — verified: a `PATCH` is visible on `GET /store` on
the next request, with no TTL wait.

Colours are stored upper-cased, so `#0f766e` comes back as `#0F766E`.

| Status | Cause |
|---|---|
| 400 | Colour is not six-digit hex — `#FFF`, `red` and any CSS payload are refused |
| 400 | `logoUrl`/`faviconUrl` is not an **https** URL |
| 400 | `supportEmail` is not an email |
| 400 | Unknown field in the body |
| 403 | `TENANT_STAFF` — **owner only**, like team management |

**Colour validation is strict on purpose.** These values reach the browser
inside a style attribute, so anything but exactly `#RRGGBB` is rejected —
verified against `#fff;background:url(x)` and `</style><script>`.

**Not yet configurable:** homepage section order, arbitrary copy blocks, and
per-page text. Only the fields above exist. See [gaps.md](gaps.md) §4.

## Admin — orders 🔐

### `GET /admin/orders`

| Param | Type | Notes |
|---|---|---|
| `page`, `limit` | int | default 1 / 20, limit max 100 |
| `status` | enum | `OrderStatus` |
| `paymentStatus` | enum | `PaymentStatus` |
| `paymentMethod` | enum | `PaymentMethod` |
| `search` | string | matches order number, customer name **or** phone |
| `placedFrom`, `placedTo` | ISO date | inclusive range on `placedAt` |

```jsonc
// 200 data — rows are SUMMARIES, not full orders
{
  "items": [{
    "id": "…uuid…",
    "orderNumber": "ORD-202609-00001",
    "status": "CONFIRMED",
    "paymentStatus": "PENDING",
    "paymentMethod": "CASH_ON_DELIVERY",
    "customerName": "Rafiqul Islam",
    "customerPhone": "01712345678",
    "grandTotal": 569700,
    "currency": "BDT",
    "placedAt": "2026-09-11T07:22:10.000Z",
    "_count": { "items": 3 }
  }],
  "page": 1, "limit": 20, "total": 1, "totalPages": 1
}
```

A row carries a line **count**, not the lines. Fetch the detail endpoint for
snapshotted items — pulling every line for a 50-row table is a large wasted
payload.

### `GET /admin/orders/counts`

```jsonc
// 200 data — every status present, including zeroes
{
  "PENDING_PAYMENT": 4, "CONFIRMED": 12, "PROCESSING": 3, "SHIPPED": 8,
  "DELIVERED": 61, "CANCELLED": 2, "REFUNDED": 1
}
```

Zeroes are always included, so a dashboard can render a stable set of tiles.

### `GET /admin/orders/:id`

Returns the customer order shape — see
[Storefront — orders](#storefront--orders-) — **plus two admin-only fields**,
`adminNote` and `statusHistory[]`. Render `items[].unitPrice` and
`shippingAddress`, never the live variant price or address.

```jsonc
// statusHistory, transcribed from a real response
"statusHistory": [
  {
    "id": "159cefb5-833a-406e-a321-8cb526246839",
    "status": "PENDING_PAYMENT",
    "note": "Recorded before status history existed",
    "byUserId": null,
    "byName": null,
    "byEmail": null,
    "createdAt": "2026-09-27T08:52:21.589Z"
  },
  {
    "id": "ce8c7b22-625a-4b41-bc5b-20c6d96aca25",
    "status": "PROCESSING",
    "note": "packing now",
    "byUserId": "b634eebf-fb85-4a3a-a1b4-aa9e9cb1897b",
    "byName": "Demo Owner",
    "byEmail": "admin@demo.local",
    "createdAt": "2026-09-30T06:50:11.074Z"
  }
]
```

- **Oldest first**, so a timeline renders top to bottom as-is.
- `note` is the `adminNote` sent with that change, or the `cancelReason` when
  cancelling.
- The actor may be **null** — orders backfilled when this shipped, or a future
  webhook. Render `byName`, fall back to `byEmail`, then to "System".
- `byName`/`byEmail` are **snapshots**, so the trail still names who acted
  after that staff member is renamed or removed.
- **Both fields are admin-only.** They are absent from `GET /orders` and
  `GET /orders/:id`; the customer surface must never show internal notes or
  staff identities.

**404** — no such order in this store.

### `PATCH /admin/orders/:id/status`

```jsonc
// request
{
  "status": "SHIPPED",
  "adminNote": "Handed to courier",      // optional, ≤500, internal only
  "cancelReason": "Customer changed their mind"  // optional, ≤500, only read when cancelling
}
```

**Allowed transitions** — anything else is a 400:

```
PENDING_PAYMENT → CONFIRMED, PROCESSING, CANCELLED
CONFIRMED       → PROCESSING, SHIPPED, CANCELLED
PROCESSING      → SHIPPED, CANCELLED
SHIPPED         → DELIVERED, CANCELLED
DELIVERED       → REFUNDED
CANCELLED       → (terminal)
REFUNDED        → (terminal)
```

Three behaviours the UI must account for, all verified end-to-end:

- **Cancelling restores stock** — but only from `PENDING_PAYMENT`,
  `CONFIRMED` or `PROCESSING`. Once shipped, the goods have physically left,
  so cancelling does **not** put stock back. Refresh any inventory view after
  a cancellation.
- **Delivering a cash-on-delivery order settles its payment**:
  `paymentStatus` becomes `PAID` in the same transaction, because the courier
  collects on handover. Gateway methods are untouched — they settle via their
  own webhook.
- **Timestamps are stamped automatically**: `confirmedAt`, `shippedAt`,
  `deliveredAt`, `cancelledAt`. `PROCESSING` and `REFUNDED` have no column of
  their own — read `statusHistory[]` for those, which also records who made
  every change.
- **Every change appends a `statusHistory` entry** in the same transaction,
  and the response returns the updated history, so the timeline needs no
  second fetch.

Errors: **400** `"Cannot change an order from DELIVERED to SHIPPED"`,
**400** `"Order is already SHIPPED"` (no-op), **404** not in this store.

`adminNote` is internal — it is never shown to the customer, and is separate
from `customerNote`.

> Still missing: refunds beyond the status flag (no gateway call), partial
> cancellation of individual lines, and courier/tracking fields.

## Admin — team 🔐👑

**Owner only.** These five routes use `@OwnerOnly()`, not `@AdminOnly()` — a
`TENANT_STAFF` token gets **403** here while still reaching every other
`/admin` route. Without that, staff could promote themselves.

| Method | Route | Notes |
|---|---|---|
| `GET` | `/admin/users` | Paginated; `search` (name or email), `isActive` |
| `GET` | `/admin/users/:id` | |
| `POST` | `/admin/users` | Create a team member |
| `PATCH` | `/admin/users/:id` | Name, password, role, active state |
| `DELETE` | `/admin/users/:id` | **Deactivates** — never hard-deletes |

```jsonc
// POST /admin/users request
{
  "name": "Karim Ahmed",
  "email": "karim@demo.local",
  "password": "temporary-pass-123",   // min 8 — you set it and pass it on
  "role": "TENANT_STAFF"              // or TENANT_OWNER
}

// 201 data — no password field, ever
{
  "id": "…uuid…",
  "name": "Karim Ahmed",
  "email": "karim@demo.local",
  "role": "TENANT_STAFF",
  "isActive": true,
  "createdAt": "2026-09-15T04:47:00.000Z",
  "updatedAt": "2026-09-15T04:47:00.000Z"
}
```

**There is no invitation email.** The owner sets an initial password and
passes it on out of band. Build the form to make that explicit — and to
suggest the new member change it.

### Rules the API enforces

- **Customers never appear here.** They share the `User` table but every query
  filters to `TENANT_OWNER` and `TENANT_STAFF`.
- **You cannot change your own role** — 400 *"You cannot change your own
  role"*. Hide or disable those controls on the current user's row.
- **You cannot deactivate yourself** — 400.
- **The last active owner cannot be demoted or deactivated** — 400 *"This is
  the store's only owner — promote someone else first"*. Promote a second
  owner first.
- **Renaming or repassrwording yourself is allowed.**
- **Email is unique per store**, so the same address may hold an account on
  another store — that is a separate user with a separate password. A
  duplicate within one store is **409**.
- **Deactivating blocks sign-in** (`401 "Account is disabled"`) without
  deleting history. `PATCH { "isActive": true }` restores access.

Every response omits `password`. It is absent from the `select`, not stripped
afterwards.

## Admin — taxonomy 🔐

| Method | Route | Notes |
|---|---|---|
| `GET` | `/admin/categories` | Flat list + counts |
| `GET` | `/admin/categories/tree` | Nested, for the navigation editor |
| `GET/POST/PATCH/DELETE` | `/admin/categories[/:id]` | Cycle-safe re-parenting; delete blocked while referenced |
| `GET/POST/PATCH/DELETE` | `/admin/brands[/:id]` | Delete blocked while products reference it |
| `GET/POST/PATCH/DELETE` | `/admin/collections[/:id]` | |
| `PUT` | `/admin/collections/:id/products` | Replaces ordered membership wholesale |

## Platform 🚫

`/api/v1/platform/*` — **no endpoints exist.** Reserved.

## Health

`GET /health` 🌐
