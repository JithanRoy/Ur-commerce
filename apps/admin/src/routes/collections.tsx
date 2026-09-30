import { Link } from "react-router";
import { collectionResource } from "@/api/taxonomy";
import { TaxonomyPage } from "@/features/taxonomy/taxonomy-page";

export function CollectionsRoute() {
  return (
    <TaxonomyPage
      title="Collections"
      description="Curated groupings, independent of category."
      resource={collectionResource}
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
      }}
    />
  );
}
