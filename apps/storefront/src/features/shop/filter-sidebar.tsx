import Link from "next/link";
import type {
  ProductFacets,
  ProductQuery,
  StorefrontCategory,
} from "@urcommerce/api-client";
import { buildShopHref } from "./search-params";
import { cn } from "@/lib/utils";

type Props = {
  query: ProductQuery;
  facets: ProductFacets;
  categories: StorefrontCategory[];
};

function FilterGroup({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b pb-5 last:border-0">
      <h2 className="mb-3 text-sm font-medium">{heading}</h2>
      {children}
    </div>
  );
}

export function FilterSidebar({ query, facets, categories }: Props) {
  const categoryNames = new Map(
    categories.map((category) => [category.id, category]),
  );

  const namedCategories = facets.categories
    .filter((facet) => facet.categoryId !== null)
    .map((facet) => ({
      facet,
      category: categoryNames.get(facet.categoryId as string),
    }))
    .filter((entry) => entry.category !== undefined);

  const hasFilters =
    Boolean(query.category) ||
    Boolean(query.brands?.length) ||
    Boolean(query.inStock);

  return (
    <aside className="space-y-5">
      {hasFilters ? (
        <Link
          href="/shop"
          className="inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Clear filters
        </Link>
      ) : null}

      {namedCategories.length > 0 ? (
        <FilterGroup heading="Category">
          <ul className="space-y-1.5">
            {namedCategories.map(({ facet, category }) => {
              const isActive = query.category === category?.slug;
              return (
                <li key={facet.categoryId}>
                  <Link
                    href={buildShopHref(query, {
                      category: isActive ? undefined : category?.slug,
                      page: 1,
                    })}
                    className={cn(
                      "flex items-center justify-between text-sm transition-colors",
                      isActive
                        ? "font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {category?.name}
                    <span className="text-xs tabular-nums">{facet.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </FilterGroup>
      ) : null}

      {facets.brands.length > 0 ? (
        <FilterGroup heading="Brand">
          <ul className="space-y-1.5">
            {facets.brands.map((brand) => {
              const selected = query.brands ?? [];
              const isActive = selected.includes(brand.slug);
              const nextBrands = isActive
                ? selected.filter((slug) => slug !== brand.slug)
                : [...selected, brand.slug];
              return (
                <li key={brand.id}>
                  <Link
                    href={buildShopHref(query, {
                      brands: nextBrands,
                      page: 1,
                    })}
                    className={cn(
                      "flex items-center justify-between text-sm transition-colors",
                      isActive
                        ? "font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {brand.name}
                    <span className="text-xs tabular-nums">{brand.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </FilterGroup>
      ) : null}

      <FilterGroup heading="Availability">
        <Link
          href={buildShopHref(query, {
            inStock: query.inStock ? undefined : true,
            page: 1,
          })}
          className={cn(
            "text-sm transition-colors",
            query.inStock
              ? "font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          In stock only
        </Link>
      </FilterGroup>
    </aside>
  );
}
