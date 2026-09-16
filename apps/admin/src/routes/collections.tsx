import { adminApi } from "@/lib/api";
import { TaxonomyPage } from "@/features/taxonomy/taxonomy-page";

export function CollectionsRoute() {
  return (
    <TaxonomyPage
      title="Collections"
      description="Curated groupings, independent of category."
      queryKey="collections"
      load={() =>
        adminApi.collections.list({ limit: 100 }).then((page) => page.items)
      }
      create={(input) => adminApi.collections.create(input)}
      remove={(id) => adminApi.collections.remove(id)}
    />
  );
}
