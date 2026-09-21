import type { Paisa } from "../money";

export type ProductCardBrand = {
  id: string;
  name: string;
  slug: string;
};

export type ProductCardImage = {
  url: string;
  alt: string | null;
};

export type ProductCardVariantPreview = {
  id: string;
  price: Paisa;
  compareAtPrice: Paisa | null;
  stock: number;
};

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  brand: ProductCardBrand | null;
  images: ProductCardImage[];
  minPrice: Paisa;
  maxPrice: Paisa;
  maxDiscountPct: number;
  totalStock: number;
  avgRating: number;
  ratingCount: number;
  variants: ProductCardVariantPreview[];
};

export type HomeCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  children?: HomeCategory[];
};

export type HomeBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

export type CategoryGridSection = {
  type: "CATEGORY_GRID";
  title: string;
  categories: HomeCategory[];
};

export type ProductCarouselSection = {
  type: "PRODUCT_CAROUSEL";
  title: string;
  seeAllUrl: string;
  products: ProductCard[];
};

export type BrandStripSection = {
  type: "BRAND_STRIP";
  title: string;
  brands: HomeBrand[];
};

export type HomeSection =
  | CategoryGridSection
  | ProductCarouselSection
  | BrandStripSection;

export type HomeResponse = {
  sections: HomeSection[];
  generatedAt: string;
};

export type ProductDetailOptionValue = {
  value: string;
};

export type ProductDetailOption = {
  name: string;
  values: ProductDetailOptionValue[];
};

export type ProductDetailVariantOptionLink = {
  optionValue: {
    value: string;
    option: { name: string; position: number };
  };
};

export type ProductDetailVariant = {
  id: string;
  sku: string;
  price: Paisa;
  compareAtPrice: Paisa | null;
  currency: string;
  stock: number;
  optionValues: ProductDetailVariantOptionLink[];
};

export type ProductDetailImage = {
  url: string;
  alt: string | null;
  variantId: string | null;
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: ProductCardBrand | null;
  category: { id: string; name: string; slug: string } | null;
  images: ProductDetailImage[];
  options: ProductDetailOption[];
  variants: ProductDetailVariant[];
  minPrice: Paisa;
  maxPrice: Paisa;
  maxDiscountPct: number;
  totalStock: number;
  metaTitle: string | null;
  metaDescription: string | null;
  avgRating: number;
  ratingCount: number;
};

export type ProductSort = "newest" | "price-asc" | "price-desc" | "discount";

export type ProductQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  inStock?: boolean;
};

export type FacetCategory = {
  categoryId: string | null;
  count: number;
};

export type FacetBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  count: number;
};

export type ProductFacets = {
  categories: FacetCategory[];
  brands: FacetBrand[];
};

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: StorefrontCategory[];
};

export type StorefrontBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  productCount: number;
};
