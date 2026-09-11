import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type {
  BrandStripSection,
  CategoryGridSection,
  ProductCarouselSection,
} from "@urcommerce/api-client";
import { ProductCard } from "./product-card";

function SectionHeading({
  title,
  seeAllUrl,
}: {
  title: string;
  seeAllUrl?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      {seeAllUrl ? (
        <Link
          href={seeAllUrl}
          className="group inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          See all
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}

export function CategoryGrid({ section }: { section: CategoryGridSection }) {
  if (section.categories.length === 0) return null;

  return (
    <section className="container-page py-12">
      <SectionHeading title={section.title} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {section.categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="group relative aspect-3/2 overflow-hidden rounded-lg bg-muted"
          >
            {category.imageUrl ? (
              <img
                src={category.imageUrl}
                alt=""
                loading="lazy"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : null}
            <div className="absolute inset-0 bg-linear-to-t from-black/65 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 p-4 text-sm font-medium text-white">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ProductCarousel({
  section,
}: {
  section: ProductCarouselSection;
}) {
  if (section.products.length === 0) return null;

  return (
    <section className="container-page py-12">
      <SectionHeading title={section.title} seeAllUrl={section.seeAllUrl} />
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {section.products.map((product) => (
          <div
            key={product.id}
            className="w-[62%] shrink-0 snap-start sm:w-auto"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function BrandStrip({ section }: { section: BrandStripSection }) {
  if (section.brands.length === 0) return null;

  return (
    <section className="border-y bg-muted/30">
      <div className="container-page py-12">
        <SectionHeading title={section.title} />
        <div className="flex flex-wrap items-center gap-3">
          {section.brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brand/${brand.slug}`}
              className="inline-flex h-11 items-center gap-2 rounded-full border bg-background px-5 text-sm transition-colors hover:border-foreground/25 hover:bg-accent"
            >
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt=""
                  loading="lazy"
                  className="size-5 rounded-full object-cover"
                />
              ) : null}
              {brand.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
