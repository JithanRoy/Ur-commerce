import { Link } from "react-router";
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
      extraColumn={{
        heading: "Products",
        render: (row) => (
          <Link
            to={`/collections/${row.id}`}
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            Manage products
          </Link>
        ),
      }}
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
