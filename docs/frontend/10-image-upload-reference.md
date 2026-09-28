# Image upload — frontend integration guide

Written for the admin SPA. Every request and response below was captured from
a live server on 2026-09-28, not written from the schema.

**The file never passes through this API.** The browser uploads straight to
object storage. That is why this is three calls instead of one, and why the
middle call behaves unlike every other endpoint here.

---

## The three steps

### 1. Ask for an upload ticket

```http
POST /api/v1/admin/uploads/product-images
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "fileName": "frontend-test.png", "contentType": "image/png", "contentLength": 70 }
```

```jsonc
// 201 data
{
  "objectKey": "tenants/5939d547-…/products/2026/09/52e3c7fa-…-frontend-test.png",
  "uploadUrl": "http://localhost:9100/urc-media/tenants/…?X-Amz-Signature=…",
  "expiresAt": "2026-09-28T03:43:29.355Z",
  "requiredHeaders": { "Content-Type": "image/png", "Content-Length": "70" }
}
```

`contentLength` is the real byte size — `file.size`. Send it before uploading;
the server refuses the ticket rather than discovering the problem afterwards.

The ticket is valid for **15 minutes**. Request it when the user picks the
file, not when they open the form.

### 2. PUT the file to `uploadUrl`

**This is the call that breaks integrations.** It differs from every other
request in this API:

- Send it to `uploadUrl` exactly as given — **not** to our API host.
- Send `requiredHeaders` **verbatim**. They are signed into the URL.
- **No `Authorization` header.** Adding one invalidates the signature.
- The response has **no `{ success, data }` envelope** — it is not our API.
- Success is **200 with an empty body**.

```js
await fetch(ticket.uploadUrl, {
  method: "PUT",
  headers: ticket.requiredHeaders,   // verbatim — do not add to these
  body: file,
});
```

Verified: changing `Content-Type` from `image/png` to `image/jpeg` on an
otherwise identical request returns **403** from storage. That is the signed
headers working, not a bug. If you see 403 here, you altered a header.

Do not set `Content-Length` by hand in the browser — `fetch` sets it from the
body. It is in `requiredHeaders` because the signature covers it; in Node or
curl you must send it explicitly.

### 3. Attach it to the product

```http
POST /api/v1/admin/products/:productId/images
Authorization: Bearer <accessToken>

{ "objectKey": "<from step 1>", "alt": "Frontend upload test", "variantId": null }
```

```jsonc
// 201 data
{
  "id": "0b56ebfb-ee18-489b-9fbe-6fea51128946",
  "productId": "b9aa2722-e767-4d89-96a1-a69da86a37a1",
  "variantId": null,
  "url": "http://localhost:9100/urc-media/tenants/…-frontend-test.png",
  "alt": "Frontend upload test",
  "position": 3
}
```

The server re-reads the stored object and re-validates its type and size
before recording the row — a presign alone would trust what the client
declared.

`position` is assigned automatically as current max + 1.

---

## On the create-product form

Upload during the media step and send the `objectKey`s inside `images[]` on
`POST /admin/products`, so creation stays **one call** and you never get a
product that exists without its pictures.

```jsonc
{ "name": "…", "slug": "…", "variants": [ … ],
  "images": [ { "objectKey": "tenants/…/a.png", "alt": "Front" } ] }
```

Each entry takes either `objectKey` **or** `url`, never both. The nested path
skips the storage re-check (it would mean N network calls inside one database
transaction), so the standalone attach endpoint in step 3 is the stricter one.

---

## The rest of the gallery API

| Method | Path | Notes |
|---|---|---|
| `GET` | `/admin/products/:id/images` | ordered by `position` |
| `PUT` | `/admin/products/:id/images/order` | `{ "imageIds": [...] }` — **every** id, exactly once |
| `PATCH` | `/admin/products/:id/images/:imageId` | `alt`, `variantId` |
| `DELETE` | `/admin/products/:id/images/:imageId` | **204**, no body |

Reorder is a full ordered replacement. A partial list is rejected with 400 —
a stale client list would otherwise scramble the gallery silently.

`variantId` pins an image to one variant. That is what makes the storefront
gallery swap when a shopper picks a colour, so it is worth wiring in the UI
for apparel.

---

## Accepted files

| | |
|---|---|
| Types | `image/jpeg`, `image/png`, `image/webp`, `image/avif` |
| Size | 1 byte – 10 MB |
| Refused | **SVG** — script-execution vector, 400 at presign |

Validate in the browser too, so the user learns before the upload rather than
after it.

---

## Status codes you must handle

| Code | When | What to show |
|---|---|---|
| **503** | storage not configured on that server | Disable the uploader with a notice. It is a feature flag, not an outage — everything else works. |
| **403** *(step 2)* | a signed header was altered | A bug in your code, not user error. |
| **403** *(step 3)* | `objectKey` outside this store's prefix | Should be unreachable; log it. |
| **404** *(step 3)* | attaching a key that was never uploaded | Step 2 failed or was skipped — retry the upload. |
| **400** | type or size rejected | Say which, and what is allowed. |

All verified live on 2026-09-28: a forged key naming another tenant returns
403, and so does `tenants/<id>evil/…` — the prefix check requires the trailing
slash. A well-formed key that was never uploaded returns 404.

---

## Two things that will cost you a day if nobody says them

**Bucket CORS.** The browser `PUT` needs the bucket to allow `PUT` from your
SPA's origin with `Content-Type` and `Content-Length`. Local MinIO permits any
origin by default, so **this works locally and fails in production** —
Cloudflare R2 needs the rule set explicitly. The failure is an opaque CORS
error in the console while `curl` succeeds.

**Image URLs are absolute and stored at attach time.** `ProductImage.url` is
written once, from `R2_PUBLIC_BASE_URL` as configured at that moment. Changing
the CDN domain later does not rewrite existing rows — it is a data migration.
Do not assume the host in a URL is current; render what the API returns.

---

## Brand logos, category and collection banners

Same three steps, one shared presign route, and the entity's own `PATCH`
replaces step 3. Both are a **single image**, not a gallery — a brand has one
logo, a category one banner — so there is no `position` and no reorder.

```http
POST /api/v1/admin/uploads/images
{ "scope": "brand", "fileName": "aarong-logo.png",
  "contentType": "image/png", "contentLength": 48211 }
```

`scope` is `product`, `brand`, `category` or `collection`. The response is
identical in shape to the product ticket.

Then attach with the entity's existing update route:

| Entity | Route | Field |
|---|---|---|
| Brand | `PATCH /admin/brands/:id` | `logoObjectKey` |
| Category | `PATCH /admin/categories/:id` | `imageObjectKey` |
| Collection | `PATCH /admin/collections/:id` | `imageObjectKey` |

```jsonc
// PATCH /admin/brands/:id
{ "logoObjectKey": "tenants/5939d547-…/brands/2026/09/25c7d332-…-aarong-logo.png" }

// 200 data — logoUrl is now resolved and public
{ "id": "b73f7851-…", "name": "Aarong", "slug": "aarong",
  "logoUrl": "https://cdn.example.com/tenants/…/brands/…/…-aarong-logo.png" }
```

**`scope` is enforced, not cosmetic.** It becomes a path segment in the key
and is re-checked on attach, so a key minted as `brand` cannot be attached to
a category — both directions return **403**, verified.

Each field still accepts a pasted `logoUrl` / `imageUrl` instead. Send
**one or the other, never both** (400). Both must now be `https` — a
`javascript:` URL is rejected, which it was not before. Send explicit `null`
to clear.

These appear on the storefront immediately: `GET /brands` returns `logoUrl`,
`GET /categories` and `GET /collections` return `imageUrl`. No separate
publish step.

## Known gaps

- **No `width`/`height` columns**, so the browser cannot reserve space and
  grids shift as images load.
- **One size per image.** No `srcset`, no thumbnails, no `width`/`height`, so
  the browser cannot reserve space and grids shift as images load.
- **Deleting a row does not delete the object.** A cron sweep reaps it after
  48 hours. Nothing detects the reverse — a row whose object has vanished
  renders as a broken image.
