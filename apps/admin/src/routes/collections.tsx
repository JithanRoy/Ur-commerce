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
      image={{
        scope: "collection",
        label: "Banner",
        urlOf: (row) => row.imageUrl,
        setKey: (id, objectKey) =>
          adminApi.collections.update(id, { imageObjectKey: objectKey }),
        clear: (id) => adminApi.collections.update(id, { imageUrl: null }),
      }}
    />
  );
}
