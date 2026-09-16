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
