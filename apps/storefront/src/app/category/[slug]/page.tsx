import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { StorefrontCategory } from "@urcommerce/api-client";
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

function flatten(categories: StorefrontCategory[]): StorefrontCategory[] {
  return categories.flatMap((category) => [
    category,
    ...flatten(category.children ?? []),
  ]);
}

async function findCategory(
  slug: string,
): Promise<StorefrontCategory | null> {
  try {
    const categories = await storefront.categories();
    return flatten(categories).find((entry) => entry.slug === slug) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const category = await findCategory(slug);
  return { title: category?.name ?? "Category" };
}

export default async function CategoryPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) notFound();

  const query = { ...parseShopQuery(await searchParams), category: slug };
  const data = await loadCatalogue(query);

  if (!data) {
    return (
      <div className="container-page py-20">
        <p className="text-center text-muted-foreground">
          We could not load this category. Please refresh in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/shop" className="hover:text-foreground">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{category.name}</span>
      </nav>

      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold">{category.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.products.total}{" "}
          {data.products.total === 1 ? "product" : "products"}
        </p>
      </header>

      <ProductGridPage
        query={query}
        products={data.products}
        facets={data.facets}
        categories={data.categories}
        showCategoryFilter={false}
        basePath={`/category/${slug}`}
        emptyTitle={`Nothing in ${category.name} yet`}
        emptyDescription="Check back soon, or browse the full shop."
      />
    </div>
  );
}
