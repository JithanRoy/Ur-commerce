import { adminApi } from "@/lib/api";
import { TaxonomyPage } from "@/features/taxonomy/taxonomy-page";

export function BrandsRoute() {
  return (
    <TaxonomyPage
      title="Brands"
      description="Labels shown on product cards and the brand strip."
      queryKey="brands"
      load={() => adminApi.brands.list({ limit: 100 }).then((page) => page.items)}
      create={(input) => adminApi.brands.create(input)}
      remove={(id) => adminApi.brands.remove(id)}
    />
  );
}
