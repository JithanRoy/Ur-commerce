# Frontend task — image uploads in the admin panel

**Status of the backend: done and verified.** Every endpoint below was
exercised against a live server on 2026-09-28, and every payload here is a
real captured response. Nothing in this document is waiting on backend work.

The API reference is [10-image-upload-reference.md](10-image-upload-reference.md). This
document is the task breakdown: what to build, in what order, and how to know
each piece is finished.

---

## What exists to build against

Four things can carry an image. They split into two shapes.

| What | Shape | Where it shows |
|---|---|---|
| **Product** | gallery — many images, ordered, optionally pinned to a variant | product card, product detail |
| **Brand** | one logo | `/brands` index, product detail |
| **Category** | one banner | category grid, category page |
| **Collection** | one banner | collection page |

The gallery is genuinely more work. The three single-image cases are the same
component three times.

---

## The upload flow, in one paragraph

The file never passes through our API. You ask the backend for a **presigned
URL**, `PUT` the file **straight to storage**, then send the returned
`objectKey` to the entity. Three calls. The middle one does not look like any
other request in this codebase — see Task 1.

---

## Task 1 — a reusable `useImageUpload` hook · **M**

Everything else depends on this. Build it once, correctly.

```ts
// 1. ticket
const { objectKey, uploadUrl, requiredHeaders } = await api.post(
  "/admin/uploads/images",
  { scope, fileName: file.name, contentType: file.type, contentLength: file.size },
);

// 2. the file goes straight to storage — NOT through our API
await fetch(uploadUrl, { method: "PUT", headers: requiredHeaders, body: file });

// 3. caller attaches objectKey to whatever it belongs to
return objectKey;
```

`scope` is `"product" | "brand" | "category" | "collection"`.

**Step 2 must bypass your API client.** It is the one call in the whole app
that does:

- go to a different host
- send **no `Authorization` header** — adding one invalidates the signature
- return **no `{ success, data }` envelope**
- succeed with **200 and an empty body**

If your axios/fetch wrapper injects auth headers or unwraps envelopes
globally, this call has to opt out. Getting this wrong produces a **403** that
looks like a permissions bug and is not.

**Validate before uploading.** JPEG, PNG, WebP, AVIF only; 1 byte to 10 MB.
The server rejects anything else at step 1, but the user should learn before
the upload, not after.

**Done when:** you can upload a PNG and get an `objectKey` back; a `.svg` and
a 12 MB file are both refused in the browser without a network call.

---

## Task 2 — brand logo upload · **S**

Add a file picker to the brand form. On save:

```http
PATCH /api/v1/admin/brands/:id
{ "logoObjectKey": "tenants/…/brands/2026/09/25c7d332-…-aarong-logo.png" }
```

```jsonc
// 200 data — logoUrl comes back resolved
{ "id": "b73f7851-…", "name": "Aarong", "slug": "aarong",
  "logoUrl": "https://cdn.example.com/tenants/…/brands/…-aarong-logo.png" }
```

The field still accepts a pasted `logoUrl` instead. Send **one or the other,
never both** — sending both is a 400. Send explicit `null` to clear.

Show the current logo with a Replace and a Remove action. Remove is
`{ "logoUrl": null }`.

**Done when:** you upload a logo in admin and it appears on the public
`/brands` response without any publish step.

---

## Task 3 — category and collection banners · **S** (together)

Identical to Task 2, different field names:

| Entity | Route | Field |
|---|---|---|
| Category | `PATCH /admin/categories/:id` | `imageObjectKey` |
| Collection | `PATCH /admin/collections/:id` | `imageObjectKey` |

If Task 2 produced a real component, this is wiring, not building.

**Done when:** a category banner set in admin shows on `GET /categories`.

---

## Task 4 — product gallery · **L**

The real work. A product has many images, they are **ordered**, and each can
be pinned to a variant.

| Method | Route | Notes |
|---|---|---|
| `GET` | `/admin/products/:id/images` | ordered by `position` |
| `POST` | `/admin/products/:id/images` | `{ objectKey, alt?, variantId? }` |
| `PUT` | `/admin/products/:id/images/order` | `{ imageIds: [...] }` |
| `PATCH` | `/admin/products/:id/images/:imageId` | `alt`, `variantId` |
| `DELETE` | `/admin/products/:id/images/:imageId` | 204, no body |

Use `POST /admin/uploads/product-images` here, or the generic route with
`scope: "product"` — they are equivalent.

**Reorder sends every id, exactly once.** A partial list is a 400. Do not
send a diff; send the whole array in its new order.

**On the create-product form**, upload during the media step and send the
`objectKey`s inside `images[]` on `POST /admin/products`, so creation stays
one call and you never get a product that exists without its pictures. Each
entry takes either `objectKey` or `url`, never both.

**Done when:** you can upload several images, drag to reorder, set alt text,
delete one, and the storefront reflects the order.

---

## Task 5 — variant pinning · **S**

**The backend for this is already done and currently unused.** `variantId` on
an image is what makes the storefront gallery swap when a shopper picks a
colour — the highest-value thing in this whole list for a clothing store.

Add a variant dropdown to each image in the gallery:

```http
PATCH /admin/products/:id/images/:imageId
{ "variantId": "be3ce1d7-…" }   // null unpins, back to a general image
```

Assigning a variant from a different product returns **400 "That variant does
not belong to this product"** — should be unreachable from your UI, but
handle it.

The storefront already returns `variantId` on every image in
`GET /products/:slug`, so the shopper-facing half is a filter on data you
already receive.

**Done when:** pinning an image to the Indigo variant makes the storefront
gallery show that image when Indigo is selected.

---

## Errors you must handle

| Code | When | What to show |
|---|---|---|
| **503** | storage not configured on that environment | Disable the uploader with a notice. It is a feature flag, not an outage — the rest of the app works. |
| **403** *(step 2)* | a signed header was altered | Your bug, not the user's. Check you are not injecting `Authorization`. |
| **403** *(step 3)* | key from another store, or another scope | Should be unreachable; log it. |
| **404** *(step 3)* | attaching a key that was never uploaded | Step 2 failed silently — retry. |
| **400** | type, size, or both-fields-sent | Say which, and what is allowed. |

`scope` is enforced server-side: a key minted as `brand` **cannot** be
attached to a category. Both directions return 403, verified. So do not try
to reuse one ticket across entity types.

---

## Two things that will cost a day if nobody says them

**Bucket CORS.** The browser `PUT` needs the storage bucket to allow `PUT`
from your admin origin. Local MinIO allows any origin by default, so **this
works in development and fails in production**, where Cloudflare R2 needs the
rule set explicitly. The failure is an opaque CORS error in the console while
`curl` succeeds. Flag it to whoever configures the bucket before you deploy.

**`CORS_ALLOWED_ORIGINS`.** Separate from the above — the API itself refuses
to boot in production without it, and an unlisted origin gets no
`Access-Control-Allow-Origin`. Your admin and storefront origins must both be
listed.

---

## Known backend gaps — design around these

- **One size per image.** No `srcset`, no thumbnails. A product grid pulling
  24 full-size images is slow on Bangladeshi mobile data. Put images behind a
  component you can later point at a resizing URL without touching call sites.
- **No `width`/`height`.** The browser cannot reserve space, so grids shift as
  images load. Use a fixed `aspect-ratio` box per image slot.
- **Deleting a row does not delete the stored file.** A cron reaps it later.
  Nothing detects the reverse — if a file is deleted out from under a row, it
  renders as a broken image. Give `<img>` an `onError` fallback.

---

## Suggested order

1. Task 1 — the hook. Nothing works without it.
2. Task 2 — brand. Smallest end-to-end proof that the hook is right.
3. Task 3 — category and collection. Should be nearly free.
4. Task 4 — product gallery.
5. Task 5 — variant pinning. Highest shopper-facing value; needs Task 4 first.
