# Getting Started

## 1. Run the backend

```bash
git clone <repo> && cd urcommerce-backend
npm install
cp .env.example .env       # fill DATABASE_URL and the two JWT secrets
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

Up on `http://localhost:3002`:

| | |
|---|---|
| API | `http://localhost:3002/api/v1` |
| Swagger UI | `http://localhost:3002/api/docs` |
| OpenAPI JSON | `http://localhost:3002/api/docs-json` |

Minimum `.env` for frontend work:

```bash
NODE_ENV=development
PORT=3002

# The APP connects as a NON-superuser so row-level security applies.
DATABASE_URL=postgresql://app_user:<pw>@localhost:5432/shopno-puron
# The Prisma CLI needs the owner; app_user cannot run DDL.
MIGRATION_DATABASE_URL=postgresql://postgres:<pw>@localhost:5432/shopno-puron

JWT_ACCESS_SECRET=<any long random string>
JWT_REFRESH_SECRET=<a different long random string>
DEFAULT_TENANT_ID=          # optional: makes bare localhost resolve to a store
CACHE_ENABLED=false         # easier while developing — no stale /home

# Image storage — OPTIONAL. Leave R2_ENDPOINT empty and the app boots fine;
# the upload routes answer 503 and everything else works. See step 5.
R2_ENDPOINT=
```

**Two database URLs, deliberately.** Pointing `DATABASE_URL` at `postgres`
silently disables every tenant-isolation policy while appearing to work — the
backend logs a loud warning at boot if you do. See the backend's
`docs/rls-setup.md` for creating `app_user`.

If your DB password contains `@`, percent-encode it as `%40` or the URL parses
wrong and you get `28P01 password authentication failed`.

## 2. Seed a store

Nothing works without a tenant — every request resolves one from the host.

```bash
SEED_SUBDOMAIN=demo \
SEED_TENANT_NAME="Demo Clothing" \
SEED_ADMIN_EMAIL=admin@demo.local \
SEED_ADMIN_PASSWORD=password123 \
npm run db:seed-tenant
```

That store now answers to `demo.localhost`. Seed a second (`SEED_SUBDOMAIN=two`)
early — cross-tenant bugs only show up with two stores.

## 3. Your first call

```bash
# public: the whole homepage
curl -s http://localhost:3002/api/v1/home \
  -H 'X-Tenant-Host: demo.localhost' | jq

# log in as the store admin
curl -s -X POST http://localhost:3002/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -H 'X-Tenant-Host: demo.localhost' \
  -d '{"email":"admin@demo.local","password":"password123"}' | jq

# authenticated admin call
TOKEN=<accessToken from above>
curl -s http://localhost:3002/api/v1/admin/products \
  -H 'X-Tenant-Host: demo.localhost' \
  -H "Authorization: Bearer $TOKEN" | jq
```

Drop `X-Tenant-Host` and you get *"Store not found for this domain"* unless
`DEFAULT_TENANT_ID` is set. That is the #1 first-day error.

## 4. Confirm the browser is unblocked

CORS must allow the two custom headers the frontend sends, or the preflight
rejects them and guest carts fail in the browser while working fine in curl.
This is fixed in `src/main.ts`:

```ts
allowedHeaders: ["Content-Type", "Authorization", "X-Cart-Session", "X-Tenant-Host"],
```

Verify:

```bash
curl -s -i -X OPTIONS http://localhost:3002/api/v1/cart \
  -H 'Origin: http://localhost:3000' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: X-Cart-Session,X-Tenant-Host' \
  | grep -i access-control-allow-headers
```

Both header names must appear in the response.

## 5. Image upload — optional, and 503 until configured

Product images upload **straight from the browser to object storage**, not
through the API. Without storage credentials the app still boots and every
other route works; the upload routes answer **503 "Image storage is not
configured on this server"**.

```bash
curl -s -X POST http://localhost:3002/api/v1/admin/uploads/product-images \
  -H 'Content-Type: application/json' \
  -H 'X-Tenant-Host: demo.localhost' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"fileName":"t.png","contentType":"image/png","contentLength":180}'
```

- **503** → storage is off. Build the uploader behind a capability check; this
  is a normal state, not an outage.
- **201** → you get `{ objectKey, uploadUrl, expiresAt, requiredHeaders }`.
  PUT the file to `uploadUrl` with `requiredHeaders` sent **verbatim**, then
  `POST /admin/products/:id/images` with the `objectKey`.

To actually exercise it locally, any S3-compatible bucket works — MinIO in
Docker is the quickest, and is what the flow was verified against:

```bash
docker run -d --name minio -p 9100:9000 \
  -e MINIO_ROOT_USER=admin -e MINIO_ROOT_PASSWORD=admin12345 \
  quay.io/minio/minio:latest server /data
docker exec minio sh -c \
  "mc alias set local http://localhost:9000 admin admin12345 && \
   mc mb local/media && mc anonymous set download local/media"
```

```bash
R2_ENDPOINT=http://localhost:9100
R2_BUCKET=media
R2_ACCESS_KEY_ID=admin
R2_SECRET_ACCESS_KEY=admin12345
R2_PUBLIC_BASE_URL=http://localhost:9100/media
```

Restart the backend — it logs `Object storage connected: bucket media`.

> A **partly** configured bucket refuses to boot on purpose: a missing
> credential would otherwise surface only after a user had picked a file.
> Set all five or none.

## 6. Generate a typed client

Do not hand-write request types. The OpenAPI document is complete and carries
verified examples.

```bash
npx openapi-typescript http://localhost:3002/api/docs-json -o src/api/schema.d.ts
```

Or, for a full client with hooks:

```bash
npx @hey-api/openapi-ts -i http://localhost:3002/api/docs-json -o src/api
```

Generated types cover request DTOs well. **Response shapes are looser** —
Nest infers them from Prisma selects, so the generator often produces
`unknown`. Where that happens, hand-write the response type from
[api-contract.md](api-contract.md); every shape there is transcribed from
a real response.

## 7. The fetch wrapper

This is the only place the envelope, the tenant header and the cart session
should appear.

```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002/api/v1";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: string[],
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  init: RequestInit & { cartSession?: string } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  if (import.meta.env.DEV) headers.set("X-Tenant-Host", "demo.localhost");
  if (init.cartSession) headers.set("X-Cart-Session", init.cartSession);

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const body = await response.json();

  if (!response.ok) {
    if (response.status === 401) clearSessionAndRedirect();
    throw new ApiError(response.status, body.message, body.errors);
  }

  return body.data as T;
}
```

## 8. A smoke test for the whole purchase path

Run this once by hand. If all six steps pass, the backend is healthy and any
remaining bug is yours.

```
1. POST /auth/register                 → 201
2. POST /auth/login                    → accessToken
3. GET  /products                      → pick a variant id with stock > 0
4. POST /cart/items  { variantId, quantity: 1 }   → cart summary, itemCount 1
5. POST /addresses   { …BD address… }             → 201, isDefault true
6. POST /checkout    { addressId, paymentMethod: "CASH_ON_DELIVERY" }
                                       → order with orderNumber ORD-YYYYMM-NNNNN
```

Then `GET /orders/:id` and confirm `items[0].unitPrice` is present and the cart
is empty.

## 9. Reference material in this repo

| Path | What |
|---|---|
| `CLAUDE.md` | Full backend context: data model, invariants, gaps |
| `docs/research/clothing-requirements.md` | Why the variant model looks like this |
| `docs/research/storefront-sections.md` | Hot Deals / New Arrivals / Flash Sale mechanics |
| `docs/rls-setup.md` | Tenant isolation at the database level |
| `prisma/schema.prisma` | The source of truth for every field |
