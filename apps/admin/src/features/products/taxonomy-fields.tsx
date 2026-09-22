import { useQuery } from "@tanstack/react-query";
import type { AdminBrand, AdminCategory } from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";

type CategoryOption = { id: string; label: string };

function flattenCategories(
  categories: AdminCategory[],
  parentId: string | null = null,
  depth = 0,
): CategoryOption[] {
  return categories
    .filter((category) => category.parentId === parentId)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
    .flatMap((category) => [
      { id: category.id, label: `${"— ".repeat(depth)}${category.name}` },
      ...flattenCategories(categories, category.id, depth + 1),
    ]);
}

export function useTaxonomy() {
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => adminApi.categories.list(),
    staleTime: 60_000,
  });

  const brands = useQuery({
    queryKey: ["admin", "brands", "all"],
    queryFn: () => adminApi.brands.list({ limit: 100 }),
    staleTime: 60_000,
  });

  return {
    categoryOptions: flattenCategories(categories.data ?? []),
    brandOptions: (brands.data?.items ?? []) as AdminBrand[],
    isPending: categories.isPending || brands.isPending,
  };
}

const selectClass =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export function TaxonomyFields({
  categoryId,
  brandId,
  onCategoryChange,
  onBrandChange,
  disabled,
}: {
  categoryId: string;
  brandId: string;
  onCategoryChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { categoryOptions, brandOptions, isPending } = useTaxonomy();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-medium">
        Category
        <select
          value={categoryId}
          disabled={disabled || isPending}
          onChange={(event) => onCategoryChange(event.target.value)}
          className={`mt-1.5 ${selectClass}`}
        >
          <option value="">Uncategorised</option>
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          Shoppers browse by category, so an uncategorised product is harder to
          find.
        </span>
      </label>

      <label className="block text-sm font-medium">
        Brand
        <select
          value={brandId}
          disabled={disabled || isPending}
          onChange={(event) => onBrandChange(event.target.value)}
          className={`mt-1.5 ${selectClass}`}
        >
          <option value="">No brand</option>
          {brandOptions.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          Optional. Used for the brand pages and filters.
        </span>
      </label>
    </div>
  );
}
