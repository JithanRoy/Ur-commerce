import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isApiError } from "@urcommerce/api-client";
import type { ProductDetail } from "@urcommerce/api-client";
import { storefront } from "@/lib/api";
import { ProductDetailClient } from "@/features/product/product-detail-client";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

async function loadProduct(slug: string): Promise<ProductDetail | null> {
  try {
    return await storefront.product(slug);
  } catch (error) {
    if (isApiError(error) && error.isNotFound) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "Not found" };

  return {
    title: product.metaTitle ?? product.name,
    description:
      product.metaDescription ?? product.description?.slice(0, 155) ?? undefined,
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  return (
    <div className="container-page py-10">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/shop" className="hover:text-foreground">
          Shop
        </Link>
        {product.category ? (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/shop?category=${product.category.slug}`}
              className="hover:text-foreground"
            >
              {product.category.name}
            </Link>
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <ProductDetailClient product={product} />
    </div>
  );
}
