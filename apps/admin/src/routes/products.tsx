import { useQuery } from "@tanstack/react-query";
import { formatPriceRange, paisa } from "@urcommerce/api-client";
import type { AdminProductListItem } from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { useAuth } from "@/stores/auth";

function priceLabel(product: AdminProductListItem): string {
  if (product.minPrice === null || product.maxPrice === null) return "—";
  return formatPriceRange(paisa(product.minPrice), paisa(product.maxPrice));
}

export function ProductsRoute() {
  const signOut = useAuth((state) => state.signOut);

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "products", { page: 1 }],
    queryFn: () => adminApi.products.list({ page: 1, limit: 20 }),
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          {data ? (
            <p className="text-sm text-muted-foreground">
              {data.total} {data.total === 1 ? "product" : "products"}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={signOut}
          className="h-9 rounded-md border border-input px-3 text-sm"
        >
          Sign out
        </button>
      </header>

      {isPending ? <p className="text-muted-foreground">Loading…</p> : null}

      {error ? (
        <p role="alert" className="text-destructive">
          {error instanceof Error ? error.message : "Could not load products."}
        </p>
      ) : null}

      {data && data.items.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-16 text-center">
          <p className="font-medium">No products yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Products you create will appear here.
          </p>
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((product) => (
                <tr key={product.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {product.status}
                  </td>
                  <td className="px-4 py-3">{priceLabel(product)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {product.totalStock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
