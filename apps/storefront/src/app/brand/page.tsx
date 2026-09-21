import type { Metadata } from "next";
import Link from "next/link";
import { storefront } from "@/lib/api";

export const metadata: Metadata = { title: "Brands" };

export const revalidate = 60;

export default async function BrandsPage() {
  const brands = await storefront.brands().catch(() => null);

  if (!brands) {
    return (
      <div className="container-page py-20">
        <p className="text-center text-muted-foreground">
          We could not load the brands. Please refresh in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Brands</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {brands.length} {brands.length === 1 ? "brand" : "brands"}
        </p>
      </header>

      {brands.length === 0 ? (
        <div className="rounded-xl border border-dashed px-8 py-20 text-center">
          <p className="font-medium">No brands yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Brands will appear here once the store adds them.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={`/brand/${brand.slug}`}
                className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border px-5 py-8 text-center transition-colors hover:border-foreground/25 hover:bg-accent/30"
              >
                {brand.logoUrl ? (
                  <img
                    src={brand.logoUrl}
                    alt=""
                    className="size-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-12 items-center justify-center rounded-full bg-muted font-display text-lg text-muted-foreground">
                    {brand.name.charAt(0)}
                  </span>
                )}
                <span className="font-medium">{brand.name}</span>
                <span className="text-xs text-muted-foreground">
                  {brand.productCount}{" "}
                  {brand.productCount === 1 ? "product" : "products"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
