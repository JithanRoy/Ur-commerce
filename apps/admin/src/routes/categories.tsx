import { categoryResource } from "@/api/taxonomy";
import { TaxonomyPage } from "@/features/taxonomy/taxonomy-page";

export function CategoriesRoute() {
  return (
    <TaxonomyPage
      title="Categories"
      description="Group products so shoppers can browse them."
      resource={categoryResource}
      image={{
        scope: "category",
        label: "Banner",
        urlOf: (row) => row.imageUrl,
      }}
    />
  );
}
