import Link from "next/link";
import type {
  ProductFacets,
  ProductQuery,
  StorefrontCategory,
} from "@urcommerce/api-client";
import { buildShopHref } from "./search-params";
import { cn } from "@/lib/utils";
import { LinkPendingIndicator } from "./catalogue-navigation";

const filterRow =
  "flex min-h-11 items-center justify-between gap-2 text-sm transition-colors has-[[data-link-pending]]:text-foreground lg:min-h-0";

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate">{children}</span>
      <LinkPendingIndicator />
    </span>
  );
}

type Props = {
  query: ProductQuery;
  basePath?: string;
  facets: ProductFacets;
  categories: StorefrontCategory[];
  showCategories?: boolean;
  showBrands?: boolean;
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

export function FilterSidebar({
  query,
  facets,
  categories,
  showCategories = true,
  showBrands = true,
  basePath = "/shop",
}: Props) {
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
          href={basePath}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground lg:min-h-0"
        >
          Clear filters
          <LinkPendingIndicator />
        </Link>
      ) : null}

      {showCategories && namedCategories.length > 0 ? (
        <FilterGroup heading="Category">
          <ul className="lg:space-y-1.5">
            {namedCategories.map(({ facet, category }) => {
              const isActive = query.category === category?.slug;
              return (
                <li key={facet.categoryId}>
                  <Link
                    href={buildShopHref(
                      query,
                      {
                        category: isActive ? undefined : category?.slug,
                        page: 1,
                      },
                      basePath,
                    )}
                    className={cn(
                      filterRow,
                      isActive
                        ? "font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <FilterLabel>{category?.name}</FilterLabel>
                    <span className="text-xs tabular-nums">{facet.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </FilterGroup>
      ) : null}

      {showBrands && facets.brands.length > 0 ? (
        <FilterGroup heading="Brand">
          <ul className="lg:space-y-1.5">
            {facets.brands.map((brand) => {
              const selected = query.brands ?? [];
              const isActive = selected.includes(brand.slug);
              const nextBrands = isActive
                ? selected.filter((slug) => slug !== brand.slug)
                : [...selected, brand.slug];
              return (
                <li key={brand.id}>
                  <Link
                    href={buildShopHref(
                      query,
                      { brands: nextBrands, page: 1 },
                      basePath,
                    )}
                    className={cn(
                      filterRow,
                      isActive
                        ? "font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <FilterLabel>{brand.name}</FilterLabel>
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
          href={buildShopHref(
            query,
            { inStock: query.inStock ? undefined : true, page: 1 },
            basePath,
          )}
          className={cn(
            filterRow,
            "lg:justify-start",
            query.inStock
              ? "font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <FilterLabel>In stock only</FilterLabel>
        </Link>
      </FilterGroup>
    </aside>
  );
}
