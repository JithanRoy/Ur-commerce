import type { ProductQuery, ProductSort } from "@urcommerce/api-client";

const SORTS: ProductSort[] = ["newest", "price-asc", "price-desc", "discount"];

export type ShopSearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function many(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value !== "") return value.split(",");
  return [];
}

function positiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseShopQuery(params: ShopSearchParams): ProductQuery {
  const sort = single(params.sort);
  const brands = many(params.brands);

  return {
    page: positiveInt(single(params.page)) ?? 1,
    limit: 24,
    ...(single(params.search) ? { search: single(params.search) } : {}),
    ...(single(params.category) ? { category: single(params.category) } : {}),
    ...(brands.length > 0 ? { brands } : {}),
    ...(positiveInt(single(params.minPrice))
      ? { minPrice: positiveInt(single(params.minPrice)) }
      : {}),
    ...(positiveInt(single(params.maxPrice))
      ? { maxPrice: positiveInt(single(params.maxPrice)) }
      : {}),
    ...(sort && SORTS.includes(sort as ProductSort)
      ? { sort: sort as ProductSort }
      : {}),
    ...(single(params.inStock) === "true" ? { inStock: true } : {}),
  };
}

export function buildShopHref(
  current: ProductQuery,
  patch: Partial<ProductQuery> & { page?: number },
): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();

  if (next.search) params.set("search", next.search);
  if (next.category) params.set("category", next.category);
  if (next.brands?.length) params.set("brands", next.brands.join(","));
  if (next.minPrice) params.set("minPrice", String(next.minPrice));
  if (next.maxPrice) params.set("maxPrice", String(next.maxPrice));
  if (next.sort) params.set("sort", next.sort);
  if (next.inStock) params.set("inStock", "true");
  if (next.page && next.page > 1) params.set("page", String(next.page));

  const qs = params.toString();
  return qs ? `/shop?${qs}` : "/shop";
}
