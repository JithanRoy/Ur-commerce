# Data fetching

Every request the admin panel makes goes through a typed hook in
`apps/admin/src/api/`. Components never call `useQuery`, `useMutation`,
`useQueryClient` or `adminApi` directly, and never write a query key by hand.

```bash
grep -rn "useQuery\|useMutation\|invalidateQueries" apps/admin/src | grep -v "src/api/"
```

should print nothing.

## Layout

```
apps/admin/src/api/
├── query-keys.ts        one key factory for every resource, plus QueryOverrides
├── use-api-mutation.ts  useApiMutation (toasts + invalidation) and useApiRequest
├── auth.ts              useCurrentUser, useLogin, useLogout
├── products.ts          product list/detail/images, variants, prefetch
├── orders.ts            order list/counts/detail, status change, prefetch
├── taxonomy.ts          categories, brands, collections, collection products
├── team.ts              staff list and access/role changes
├── settings.ts          store branding
└── uploads.ts           signed-upload tickets + PUT to storage
```

The layering is:

```
@urcommerce/api-client   endpoint methods, envelope unwrapping, types
        ↓
src/api/*.ts             query options, query hooks, mutation hooks, keys
        ↓
routes / features        call hooks, render, own UI copy and inline errors
```

## Query keys

`queryKeys` in `query-keys.ts` is the only place a key is spelled out:

```ts
queryKeys.products.all; // ["admin", "products"]
queryKeys.products.list(params); // ["admin", "products", { page, search, status }]
queryKeys.products.detail(id); // ["admin", "products", id]
queryKeys.products.images(id); // ["admin", "products", id, "images"]
queryKeys.orders.counts(); // ["admin", "orders", "counts"]
queryKeys.categories.tree(); // ["admin", "categories", "tree"]
queryKeys.auth.me(); // ["auth", "me"]
```

Keys are hierarchical, so invalidating a prefix invalidates everything under
it: `queryKeys.collections.all` refreshes the collection list and every
collection detail.

Product and order lists share their root with the detail keys. To refresh
"everything except the detail I just wrote into the cache", use
`productQueriesExcept(id)` / `orderQueriesExcept(id)`, which return an
invalidation filter rather than a key.

## Queries

Each query is declared once with `queryOptions`, then wrapped in a hook:

```ts
export function orderDetailQuery(orderId: string) {
  return queryOptions({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => adminApi.orders.get(orderId),
  });
}

export function useOrder(orderId: string, options?: QueryOverrides<…>) {
  return useQuery({
    ...orderDetailQuery(orderId),
    enabled: Boolean(orderId),
    ...options,
  });
}
```

The `xxxQuery()` builder is what prefetching and cache reads use, so they can
never drift from the hook. Behaviour that belongs to the resource (`retry:
false`, `staleTime`) lives in the builder; behaviour that belongs to a screen
(`placeholderData: keepPreviousData`, `select`, `enabled`) is passed as an
override at the call site.

## Mutations

`useApiMutation` wraps `useMutation` with the panel's conventions:

| Option            | Effect                                                              |
| ----------------- | ------------------------------------------------------------------- |
| `success`         | `toast.success(text)`; a string or `(data, variables) => string`    |
| `error`           | fallback text for `toast.error` when the error is not an `ApiError` |
| `onError`         | handle the error yourself (inline message); **no toast is shown**   |
| `silentError`     | show nothing on error                                               |
| `invalidate`      | keys or filters to invalidate after success                         |
| `awaitInvalidate` | refetch first, then toast and run `onSuccess`                       |

Everything else (`onMutate`, `onSettled`, `networkMode`, …) passes through.

Resource hooks such as `useUpdateProduct` are built on it. They own the data
consequences (cache writes, invalidation); the screen owns the copy:

```ts
const save = useUpdateProduct(productId, {
  success: "Details saved.",
  onSuccess: (updated) => seedDetails(updated),
  onError: (error) => setError(isApiError(error) ? error.message : "…"),
});
```

Conventions:

- Every mutation confirms success with a toast. Silent success is a bug.
- A screen that renders errors inline passes `onError`; do not also toast.
- Anything that touches variants invalidates and refetches — the server
  recomputes `minPrice`, `maxPrice`, `totalStock`. No optimistic updates.
- Where the response is the full updated resource, write it into the detail
  cache with `setQueryData` inside the resource hook, then invalidate the rest.

`useApiRequest(fn)` is for code that drives its own loop and handles each
failure itself (multi-file uploads, login, logout). It returns `mutateAsync`
with errors left to the caller and `networkMode: "always"`, so an offline
request fails immediately instead of pausing.

## Prefetch

Prefetch on hover/focus through the resource module, never through a raw
`queryClient` call:

```ts
const prefetchOrder = usePrefetchOrderDetail();
<Link onMouseEnter={() => prefetchOrder(order.id)} … />
```

The prefetch hook also preloads the lazy route chunk. Detail screens seed from
list rows already in the cache (`findProductInLists`, `useListedOrder`) so the
header renders before the detail request lands.

## Adding an endpoint

1. Add the method to `packages/api-client/src/admin/endpoints.ts` with its
   request and response types.
2. Add a key to `queryKeys` if it is a read.
3. In the resource file under `src/api/`, add an `xxxQuery()` builder and a
   `useXxx()` hook, or a mutation hook built on `useApiMutation` that declares
   what it invalidates.
4. Call the hook from the component. Pass toast copy and inline error handling
   as options.

## Why not one generic `useGet(url)` hook

A single `useGet("/admin/products/" + id)` looks simpler and loses most of what
the layer is for:

- **Typing.** Response and request types live on each `@urcommerce/api-client`
  method. A URL string cannot carry them, so every call site would need a
  hand-written generic that nothing checks.
- **The envelope.** Unwrapping `{ success, message, data }`, token refresh and
  the dev tenant header happen once in the api-client. A URL-based hook either
  duplicates that or bypasses it.
- **Keys.** The key would become the URL string, so invalidating "all product
  lists" or "everything under this order" turns into string matching.

One hook per endpoint is more files but each is a few lines, and the compiler
checks every call.

## Storefront

The storefront follows the same layering for **client-side** data. Every
browser request goes through a hook in `apps/storefront/src/api/`; components
never import `useQuery`, `useMutation`, `useQueryClient` or the `cartApi` /
`checkoutApi` / `authApi` clients from `@/lib/browser-api`.

```bash
grep -rn "useQuery\|useMutation\|invalidateQueries\|setQueryData" apps/storefront/src | grep -v "src/api/"
```

prints only `useIsMutating` in `components/layout/navigation-progress.tsx`,
which drives the global progress bar from mutation activity and is not a
request.

Server components (pages, `lib/load-store.ts`, `features/shop/load-catalogue.ts`)
keep fetching on the server through `@/lib/api`. Hooks cannot run in an RSC,
and the catalogue, product detail and home pages stay server-rendered on
purpose: that keeps the bundle small, which matters for conversion.

### Layout

```
apps/storefront/src/api/
├── query-keys.ts        queryKeys, mutationKeys, QueryOverrides
├── use-api-mutation.ts  useApiMutation, apiErrorMessage
├── cart.ts              useCart, useInvalidateCart, useCartMutations, useCartLineMutations
├── orders.ts            useOrders, useOrder
├── addresses.ts         useAddresses, useCreate/Update/Remove/SetDefaultAddress
├── checkout.ts          useCheckoutQuote, usePlaceOrder
└── auth.ts              useRegister, useSignIn, useSignOut
```

### Keys

The customer-facing keys are unscoped. Admin and storefront are different
apps with different `QueryClient`s, so they never share a cache.

```ts
queryKeys.cart.detail(); // ["cart"]
queryKeys.orders.list(); // ["orders"]
queryKeys.orders.detail(id); // ["orders", id]
queryKeys.addresses.list(); // ["addresses"]
queryKeys.checkout.quote(addressId); // ["checkout", "quote", addressId]
mutationKeys.cart.all; // ["cart"]
mutationKeys.cart.line(lineId); // ["cart", "line", lineId]
```

There is no `auth/me` query. The storefront session lives in the Zustand store
`@/stores/auth`, not in the query cache.

### Mutations: inline errors, not toasts

The storefront mounts no `<Toaster />`. Errors render inline beside the control
that failed, so `useApiMutation` here differs from the admin version:

| Option            | Effect                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| `onErrorMessage`  | `(message, error)`. `message` is `ApiError.message` or the `error` fallback |
| `error`           | fallback text used when the error is not an `ApiError`                 |
| `invalidate`      | keys or filters to invalidate after success (fired before `onSuccess`) |
| `awaitInvalidate` | wait for the refetch before running `onSuccess`                        |
| `success`         | optional toast, loaded lazily. It shows nothing until a Toaster is mounted |

It never toasts an error. `apiErrorMessage(error, fallback)` is the one place
that normalises an unknown error into text. Forms that `await mutateAsync()`
call it in their `catch`.

### Rules specific to the shop

- **Cart mutations are optimistic and ordered.** `useCartLineMutations(lineId)`
  patches the cached cart in `onMutate` and rolls back on error. It runs in a
  per-line `scope`, so rapid +/− taps on one line apply in order while
  different lines stay independent. A server response is written back only
  when it is the last cart mutation in flight (`isOnlyPendingCartMutation`),
  so an older response never overwrites a newer optimistic state. Do not
  replace these with `useApiMutation`.
- **Sign-in owns the cart hand-off.** `useSignIn` stores the session, drops the
  guest `X-Cart-Session` token and waits for the cart refetch before resolving,
  so the merged cart is in the cache when the form navigates. `useSignOut`
  does the reverse. Revoking the server session is best-effort: a failed
  revoke still signs out locally.
- **Auth mutations use `networkMode: "always"`.** An offline sign-in or
  sign-out fails immediately instead of pausing forever.
- **`usePlaceOrder` refetches the cart on success and on 409.** The screen only
  picks the copy for the sold-out message. Checkout has no idempotency key, so
  keep the submit button disabled while `isPending`.
