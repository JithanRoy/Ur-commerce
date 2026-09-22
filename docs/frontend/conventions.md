# Conventions — the rules that bite

Read this before writing a single request. Each rule here corresponds to a
real trap in the API.

## 1. The response envelope

**Every successful response** is wrapped by a global interceptor:

```jsonc
{
  "success": true,
  "message": "Products fetched successfully",
  "data": { /* the actual payload */ }
}
```

**Every error** comes from a global filter, in a different shape:

```jsonc
{
  "success": false,
  "message": "Product not found",
  "errors": ["email must be an email", "password must be longer than..."],
  "path": "/api/v1/products/foo",
  "timestamp": "2026-09-11T07:22:10.000Z"
}
```

- `errors` is present **only** for validation failures (422/400 from
  `ValidationPipe`), where `message` is the first item of `errors`.
- There is no `statusCode` field in the body — read the HTTP status.

Unwrap `data` exactly once, in your HTTP client. A component must never see
the envelope.

```ts
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, withDefaults(init));
  const body = await res.json();

  if (!res.ok || body.success === false) {
    throw new ApiError(res.status, body.message, body.errors);
  }
  return body.data as T;
}
```

## 2. Money is integer paisa

`189900` means **৳1,899.00**. Always.

- Never store taka. Never use floats. Never `parseFloat` a price.
- Divide by 100 **only** at the render boundary.
- Arithmetic (subtotals, discounts) happens in paisa, as integers.

```ts
export const formatBDT = (paisa: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
  }).format(paisa / 100);

formatBDT(189900); // "৳1,899"
```

Every object carrying an amount also carries `currency` (always `"BDT"`
today). Read it rather than hardcoding the symbol, so a second currency later
is a formatting change, not a migration.

## 3. Pagination is flat

There is **no `meta` wrapper**. Inside `data`:

```jsonc
{
  "items": [ /* … */ ],
  "page": 1,
  "limit": 20,
  "total": 47,
  "totalPages": 3
}
```

Query params: `?page=1&limit=20`. `limit` is capped at **100**; anything
higher is a 400.

## 4. The tenant comes from the hostname

You never send a tenant id. `TenantMiddleware` resolves the store from the
`Host` header before any controller runs.

**In production**: nothing to do. `demo.yourdomain.com` resolves to that store.
An unknown host gets *"Store not found for this domain"*.

**In local development**: a browser cannot set `Host`, so send the override
header:

```
X-Tenant-Host: demo.localhost
```

This is honoured **only when `NODE_ENV !== "production"`**. In production it is
ignored entirely — otherwise it would be a tenant-spoofing header on every
request. So:

```ts
const headers: Record<string, string> = {};
if (import.meta.env.DEV) headers["X-Tenant-Host"] = "demo.localhost";
```

Do not ship it to production. It will not work and it signals the wrong thing.

## 5. A token belongs to one store

`User.email` is unique **per tenant**. One person shopping at two stores is
**two separate accounts with different user ids** — not one identity with two
memberships.

A token minted by store A, sent to store B, gets **403** *"Please sign in to
this store"*. Store tokens per-origin (they naturally are, if you use
`localStorage` on a per-subdomain basis) and never share one across stores.

## 6. Variants, not products

`Product` is the marketing object: name, description, images, brand.
**`ProductVariant` is the thing you buy**: it owns `sku`, `price`,
`compareAtPrice`, `stock`.

- `POST /cart/items` takes a **`variantId`**.
- A product's `minPrice`/`maxPrice` are denormalized aggregates over its
  variants — use them for cards ("from ৳1,899"), never for a buy button.
- On a detail page, the customer picks option values (Size: 40, Colour: Black)
  and you resolve that combination to exactly one variant. See
  the storefront spec in `frontend-handoff/docs/`.

## 7. Sizes sort by `position`, never alphabetically

Alphabetical gives `L, M, S, XL`. The API returns `position` on each option;
sort by it.

```ts
variant.optionValues
  .sort((a, b) => a.optionValue.option.position - b.optionValue.option.position);
```

This applies to the option **and** its values — `ProductOptionValue.position`
orders S → M → L → XL within the Size option.

## 8. Order lines are snapshots — never join back to the catalogue

An `OrderItem` carries its own `productName`, `variantSku`, `optionSummary`,
`unitPrice` and `lineTotal`, frozen at purchase time.

**On any order screen, render `item.unitPrice`.** Never fetch the variant and
show its current price — that rewrites history the moment the store reprices.
`item.variantId` is a nullable soft pointer that survives variant deletion;
use it only to build a "buy again" link, and handle `null`.

Same for the address: `order.shippingAddress` is a **JSON snapshot** of where
the parcel went. `order.address` is the live address-book row and may since
have been edited. Render the snapshot.

## 9. `costPrice` does not exist publicly

The admin surface returns `costPrice`; the storefront never does, by
construction (a Prisma `select` omits it). If you see it in a public response,
that is a security bug — report it.

## 10. Guest carts need a header — and a CORS fix

A signed-out cart is keyed by an opaque token you generate and send as
`X-Cart-Session`. A signed-in cart is keyed by user id and the header is
ignored.

```ts
let token = localStorage.getItem("cart-session");
if (!token) {
  token = `guest-${crypto.randomUUID()}`;
  localStorage.setItem("cart-session", token);
}
```

Send it on every `/cart*` call **and on `POST /auth/login`** — the login
endpoint merges the guest cart into the customer's, summing quantities (capped
at stock). Clear the token after a successful login.

> ✅ **Fixed.** CORS previously allowed only `Content-Type` and
> `Authorization`, so the preflight rejected `X-Cart-Session` and
> `X-Tenant-Host` — guest carts and the dev tenant override failed in a browser
> while working in curl. `main.ts` now allows all four.

## 11. Status codes you must handle

| Code | Meaning here | What the UI does |
|---|---|---|
| 400 | Validation, or business rule (empty cart, stock exceeded) | Show `message`; field errors from `errors` |
| 401 | Missing/invalid/expired token | Redirect to login |
| 403 | Wrong store, or insufficient role | "Please sign in to this store" / hide the feature |
| 404 | Not found **in this store** | Real 404 page |
| 409 | Conflict — duplicate slug/SKU, or **sold out mid-checkout** | Inline conflict message; refetch cart |
| 503 | A capability is not configured on this server (today: image storage) | Disable that feature, not the page |
| 500 | Unhandled | Generic error, log it |

**409 on `POST /checkout` is the one to get right.** It means a variant sold
out between the customer loading the page and pressing Pay. The whole order is
rejected — nothing was charged, no stock moved. Refetch the cart (lines now
have `exceedsStock: true`) and ask them to adjust.

## 11a. One call does NOT follow these conventions

Uploading a product image is a **direct PUT to object storage**, not a call to
this API. It is the single exception to nearly everything above:

| | Every API call | The upload PUT |
|---|---|---|
| Envelope | `{ success, message, data }` | none — S3-style XML on error |
| Auth | `Authorization: Bearer` | the URL signature itself |
| Tenant | `X-Tenant-Host` / real Host | encoded in the object key |
| Origin | the API | the storage host |

So keep it **outside the shared API client**: an interceptor that unwraps
`data` or attaches a bearer token will either crash on the response or get a
403 from the extra header.

`Content-Type` and `Content-Length` are signed into the URL. Send the
`requiredHeaders` object back **verbatim** — altering, omitting or adding to it
gives 403 from storage, which reads like an auth failure and is not.

Full flow in [api-contract.md](api-contract.md) under *Admin — product images*.

## 12. Date and time

All timestamps are ISO 8601 UTC strings. Bangladesh is **UTC+6** with no DST —
convert for display.

## 13. Code style

- Do not add explanatory comments to code. Express intent through naming.
- Rationale belongs in docs, not inline.
