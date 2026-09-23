import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { loadCatalogue } from "@/features/shop/load-catalogue";
import { ProductGridPage } from "@/features/shop/product-grid-page";
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
  const data = await loadCatalogue(query);

  if (!data) {
    return (
      <div className="container-page py-20">
        <p className="text-center text-muted-foreground">
          We could not load the shop. Please refresh in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold">
          {query.search ? (
            <>
              Results for{" "}
              <span className="italic text-primary">
                &ldquo;{query.search}&rdquo;
              </span>
            </>
          ) : (
            "Shop"
          )}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {data.products.total}{" "}
            {data.products.total === 1 ? "product" : "products"}
          </p>
          {query.search ? (
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:border-foreground/40"
            >
              <X className="size-3" aria-hidden />
              Clear search
            </Link>
          ) : null}
        </div>
      </header>

      <ProductGridPage
        query={query}
        products={data.products}
        facets={data.facets}
        categories={data.categories}
        emptyTitle={
          query.search
            ? `No products match “${query.search}”`
            : "No products match those filters"
        }
        emptyDescription={
          query.search
            ? "Check the spelling, or try a broader word like “shirt”."
            : "Try removing a filter or searching for something else."
        }
      />
    </div>
  );
}
