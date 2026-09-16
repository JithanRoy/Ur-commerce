import type { Metadata } from "next";
import { storefront } from "@/lib/api";
import { ProductCard } from "@/components/home/product-card";
import { FilterSidebar } from "@/features/shop/filter-sidebar";
import { SortLinks } from "@/features/shop/sort-select";
import { Pagination } from "@/features/shop/pagination";
import {
  parseShopQuery,
  type ShopSearchParams,
} from "@/features/shop/search-params";

export const metadata: Metadata = {
  title: "Shop",
};

export const revalidate = 60;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const query = parseShopQuery(await searchParams);

  const [productsResult, facetsResult, categoriesResult] =
    await Promise.allSettled([
      storefront.products(query),
      storefront.facets(query),
      storefront.categories(),
    ]);

  if (productsResult.status === "rejected") {
    return (
      <div className="container-page py-20">
        <p className="text-center text-muted-foreground">
          We could not load the shop. Please refresh in a moment.
        </p>
      </div>
    );
  }

  const products = productsResult.value;
  const facets =
    facetsResult.status === "fulfilled"
      ? facetsResult.value
      : { categories: [], brands: [] };
  const categories =
    categoriesResult.status === "fulfilled" ? categoriesResult.value : [];

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Shop</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {products.total} {products.total === 1 ? "product" : "products"}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[200px_1fr]">
        <FilterSidebar
          query={query}
          facets={facets}
          categories={categories}
        />

        <div className="min-w-0">
          <div className="mb-6">
            <SortLinks query={query} />
          </div>

          {products.items.length === 0 ? (
            <div className="rounded-xl border border-dashed px-8 py-20 text-center">
              <p className="font-medium">No products match those filters</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try removing a filter or searching for something else.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
              {products.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <Pagination
            query={query}
            page={products.page}
            totalPages={products.totalPages}
          />
        </div>
      </div>
    </div>
  );
}
