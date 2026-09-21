import type {
  ProductFacets,
  ProductQuery,
  StorefrontCategory,
} from "@urcommerce/api-client";
import type { Paginated, ProductCard } from "@urcommerce/api-client";
import { storefront } from "@/lib/api";

export type CatalogueData = {
  products: Paginated<ProductCard>;
  facets: ProductFacets;
  categories: StorefrontCategory[];
};

export async function loadCatalogue(
  query: ProductQuery,
): Promise<CatalogueData | null> {
  const [productsResult, facetsResult, categoriesResult] =
    await Promise.allSettled([
      storefront.products(query),
      storefront.facets(query),
      storefront.categories(),
    ]);

  if (productsResult.status === "rejected") return null;

  return {
    products: productsResult.value,
    facets:
      facetsResult.status === "fulfilled"
        ? facetsResult.value
        : { categories: [], brands: [] },
    categories:
      categoriesResult.status === "fulfilled" ? categoriesResult.value : [],
  };
}
