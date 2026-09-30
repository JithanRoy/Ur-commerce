import type {
  ProductFacets,
  ProductQuery,
  StorefrontCategory,
} from "@urcommerce/api-client";
import type { Paginated, ProductCard as ProductCardData } from "@urcommerce/api-client";
import { ProductCard } from "@/components/product/product-card";
import { FilterSidebar } from "./filter-sidebar";
import { SortLinks } from "./sort-select";
import { Pagination } from "./pagination";
import { CatalogueLayout } from "./catalogue-layout";
import { CatalogueResults } from "./catalogue-navigation";

function activeFilterCount(query: ProductQuery): number {
  return (
    (query.category ? 1 : 0) +
    (query.brands?.length ?? 0) +
    (query.inStock ? 1 : 0)
  );
}

type Props = {
  query: ProductQuery;
  products: Paginated<ProductCardData>;
  facets: ProductFacets;
  categories: StorefrontCategory[];
  showCategoryFilter?: boolean;
  showBrandFilter?: boolean;
  basePath?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function ProductGridPage({
  query,
  products,
  facets,
  categories,
  showCategoryFilter = true,
  showBrandFilter = true,
  basePath = "/shop",
  emptyTitle = "No products match those filters",
  emptyDescription = "Try removing a filter or searching for something else.",
}: Props) {
  return (
    <CatalogueLayout
      activeFilterCount={activeFilterCount(query)}
      sort={<SortLinks query={query} basePath={basePath} />}
      filters={
        <FilterSidebar
          query={query}
          facets={facets}
          categories={categories}
          showCategories={showCategoryFilter}
          showBrands={showBrandFilter}
          basePath={basePath}
        />
      }
    >
      <CatalogueResults>
        {products.items.length === 0 ? (
          <div className="rounded-xl border border-dashed px-8 py-20 text-center">
            <p className="font-medium">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {emptyDescription}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 items-stretch gap-x-4 gap-y-8 sm:grid-cols-3">
            {products.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </CatalogueResults>

      <Pagination
        query={query}
        page={products.page}
        totalPages={products.totalPages}
        basePath={basePath}
      />
    </CatalogueLayout>
  );
}
