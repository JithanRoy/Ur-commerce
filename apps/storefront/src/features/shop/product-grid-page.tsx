import type {
  ProductFacets,
  ProductQuery,
  StorefrontCategory,
} from "@urcommerce/api-client";
import type { Paginated, ProductCard as ProductCardData } from "@urcommerce/api-client";
import { ProductCard } from "@/components/home/product-card";
import { FilterSidebar } from "./filter-sidebar";
import { SortLinks } from "./sort-select";
import { Pagination } from "./pagination";

type Props = {
  query: ProductQuery;
  products: Paginated<ProductCardData>;
  facets: ProductFacets;
  categories: StorefrontCategory[];
  showCategoryFilter?: boolean;
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
  basePath = "/shop",
  emptyTitle = "No products match those filters",
  emptyDescription = "Try removing a filter or searching for something else.",
}: Props) {
  return (
    <div className="grid gap-10 lg:grid-cols-[200px_1fr]">
      <FilterSidebar
        query={query}
        facets={facets}
        categories={categories}
        showCategories={showCategoryFilter}
        basePath={basePath}
      />

      <div className="min-w-0">
        <div className="mb-6">
          <SortLinks query={query} basePath={basePath} />
        </div>

        {products.items.length === 0 ? (
          <div className="rounded-xl border border-dashed px-8 py-20 text-center">
            <p className="font-medium">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {emptyDescription}
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
          basePath={basePath}
        />
      </div>
    </div>
  );
}
