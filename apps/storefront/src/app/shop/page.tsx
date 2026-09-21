import type { Metadata } from "next";
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
        <h1 className="font-display text-3xl font-semibold">Shop</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.products.total}{" "}
          {data.products.total === 1 ? "product" : "products"}
        </p>
      </header>

      <ProductGridPage
        query={query}
        products={data.products}
        facets={data.facets}
        categories={data.categories}
      />
    </div>
  );
}
