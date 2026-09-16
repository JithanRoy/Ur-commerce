# Getting Started

## 1. Run the backend

```bash
git clone <repo> && cd shopno-puron-ecommerce
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
DATABASE_URL=postgresql://postgres:password@localhost:5432/shopno-puron
JWT_ACCESS_SECRET=<any long random string>
JWT_REFRESH_SECRET=<a different long random string>
DEFAULT_TENANT_ID=          # optional: makes bare localhost resolve to a store
CACHE_ENABLED=false         # easier while developing — no stale /home
```

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

The seed script's defaults are `admin@demo.local` / `password123` — note the
`.local`, not `.com`. If you seed without `SEED_ADMIN_EMAIL`, that is the
account you get.

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

## 4. Unblock the browser (do this before writing cart code)

The backend's CORS config currently allows only `Content-Type` and
`Authorization`. `X-Cart-Session` and `X-Tenant-Host` fail the preflight — so
curl works and the browser does not, which is a confusing hour.

One line in `src/main.ts`:

```ts
allowedHeaders: ["Content-Type", "Authorization", "X-Cart-Session", "X-Tenant-Host"],
```

Confirm it has landed before building the cart.

## 5. Generate a typed client

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
[02-api-contract.md](02-api-contract.md); every shape there is transcribed from
a real response.

## 6. The fetch wrapper

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

## 7. A smoke test for the whole purchase path

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

## 8. Reference material in this repo

| Path | What |
|---|---|
| `CLAUDE.md` | Full backend context: data model, invariants, gaps |
| `docs/research/clothing-requirements.md` | Why the variant model looks like this |
| `docs/research/storefront-sections.md` | Hot Deals / New Arrivals / Flash Sale mechanics |
| `docs/rls-setup.md` | Tenant isolation at the database level |
| `prisma/schema.prisma` | The source of truth for every field |
