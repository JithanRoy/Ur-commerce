import type { ApiClient } from "../client";
import type { Paginated } from "../types";
import type {
  HomeResponse,
  ProductCard,
  ProductDetail,
  ProductFacets,
  ProductQuery,
  StorefrontBrand,
  StorefrontCategory,
} from "./types";

function toQuery(query: ProductQuery): Record<string, string | number | undefined> {
  const { brands, inStock, ...rest } = query;
  return {
    ...rest,
    ...(brands && brands.length > 0 ? { brands: brands.join(",") } : {}),
    ...(inStock ? { inStockOnly: "true" } : {}),
  };
}

export function createStorefrontApi(client: ApiClient) {
  return {
    home: () => client.get<HomeResponse>("/home"),
    products: (query: ProductQuery = {}) =>
      client.get<Paginated<ProductCard>>("/products", { query: toQuery(query) }),
    facets: (query: ProductQuery = {}) =>
      client.get<ProductFacets>("/products/facets", { query: toQuery(query) }),
    product: (slug: string) => client.get<ProductDetail>(`/products/${slug}`),
    categories: () => client.get<StorefrontCategory[]>("/categories"),
    brands: () => client.get<StorefrontBrand[]>("/brands"),
  };
}

export type StorefrontApi = ReturnType<typeof createStorefrontApi>;
