import { brandResource } from "@/api/taxonomy";
import { TaxonomyPage } from "@/features/taxonomy/taxonomy-page";

export function BrandsRoute() {
  return (
    <TaxonomyPage
      title="Brands"
      description="Labels shown on product cards and the brand strip."
      resource={brandResource}
      image={{
        scope: "brand",
        label: "Logo",
        urlOf: (row) => row.logoUrl,
      }}
    />
  );
}
