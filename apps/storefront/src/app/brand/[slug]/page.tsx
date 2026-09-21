import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { StorefrontBrand } from "@urcommerce/api-client";
import { storefront } from "@/lib/api";
import { loadCatalogue } from "@/features/shop/load-catalogue";
import { ProductGridPage } from "@/features/shop/product-grid-page";
import {
  parseShopQuery,
  type ShopSearchParams,
} from "@/features/shop/search-params";

export const revalidate = 60;

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ShopSearchParams>;
};

async function findBrand(slug: string): Promise<StorefrontBrand | null> {
  try {
    const brands = await storefront.brands();
    return brands.find((entry) => entry.slug === slug) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const brand = await findBrand(slug);
  return { title: brand?.name ?? "Brand" };
}

export default async function BrandPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const brand = await findBrand(slug);
  if (!brand) notFound();

  const query = { ...parseShopQuery(await searchParams), brands: [slug] };
  const data = await loadCatalogue(query);

  if (!data) {
    return (
      <div className="container-page py-20">
        <p className="text-center text-muted-foreground">
          We could not load this brand. Please refresh in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/brand" className="hover:text-foreground">
          Brands
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{brand.name}</span>
      </nav>

      <header className="mb-8 flex items-center gap-4">
        {brand.logoUrl ? (
          <img
            src={brand.logoUrl}
            alt=""
            className="size-14 rounded-full object-cover"
          />
        ) : null}
        <div>
          <h1 className="font-display text-3xl font-semibold">{brand.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.products.total}{" "}
            {data.products.total === 1 ? "product" : "products"}
          </p>
        </div>
      </header>

      <ProductGridPage
        query={query}
        products={data.products}
        facets={data.facets}
        categories={data.categories}
        showBrandFilter={false}
        basePath={`/brand/${slug}`}
        emptyTitle={`Nothing from ${brand.name} yet`}
        emptyDescription="Check back soon, or browse the full shop."
      />
    </div>
  );
}
