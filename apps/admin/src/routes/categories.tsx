import { adminApi } from "@/lib/api";
import { TaxonomyPage } from "@/features/taxonomy/taxonomy-page";

export function CategoriesRoute() {
  return (
    <TaxonomyPage
      title="Categories"
      description="Group products so shoppers can browse them."
      queryKey="categories"
      load={() => adminApi.categories.list()}
      create={(input) => adminApi.categories.create(input)}
      remove={(id) => adminApi.categories.remove(id)}
    />
  );
}
