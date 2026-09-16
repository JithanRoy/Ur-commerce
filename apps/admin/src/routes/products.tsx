import { useState } from "react";
import { Link } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { formatPriceRange, paisa } from "@urcommerce/api-client";
import type { AdminProduct, ProductStatus } from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

const statusStyles: Record<ProductStatus, string> = {
  ACTIVE: "bg-success/10 text-success",
  DRAFT: "bg-muted text-muted-foreground",
  ARCHIVED: "bg-destructive/10 text-destructive",
};

function priceLabel(product: AdminProduct): string {
  if (product.minPrice === null || product.maxPrice === null) return "—";
  return formatPriceRange(paisa(product.minPrice), paisa(product.maxPrice));
}

export function ProductsRoute() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [page, setPage] = useState(1);

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "products", { page, search, status }],
    queryFn: () =>
      adminApi.products.list({
        page,
        limit: 20,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(status ? { status } : {}),
      }),
    placeholderData: keepPreviousData,
  });

  const newProductLink = (
    <Link
      to="/products/new"
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
    >
      <Plus className="size-4" />
      New product
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Products"
        count={data?.total}
        description="Everything in your catalogue."
        action={newProductLink}
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="Search products"
          aria-label="Search products"
          className="h-9 min-w-56 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
        />
        <select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as ProductStatus | "");
          }}
          aria-label="Filter by status"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {isPending ? <LoadingState /> : null}

      {error ? (
        <ErrorState
          message={
            error instanceof Error ? error.message : "Could not load products."
          }
        />
      ) : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          title={search || status ? "No matching products" : "No products yet"}
          description={
            search || status
              ? "Try a different search or filter."
              : "Create your first product to start selling."
          }
          action={search || status ? undefined : newProductLink}
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Variants</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((product) => (
                  <tr key={product.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        to={`/products/${product.id}`}
                        className="font-medium hover:underline"
                      >
                        {product.name}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {product.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          statusStyles[product.status],
                        )}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {priceLabel(product)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {product.variants.length}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right tabular-nums",
                        product.totalStock === 0 && "text-destructive",
                      )}
                    >
                      {product.totalStock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={data.page <= 1}
                  className="h-9 rounded-md border border-input px-3 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={data.page >= data.totalPages}
                  className="h-9 rounded-md border border-input px-3 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
