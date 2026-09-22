import type { Paisa } from "../money";

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type AdminOptionValue = {
  id: string;
  optionId: string;
  value: string;
  position: number;
};

export type AdminProductOption = {
  id: string;
  productId: string;
  name: string;
  position: number;
  values: AdminOptionValue[];
};

export type AdminVariantOptionValue = {
  variantId: string;
  optionValueId: string;
  optionValue: AdminOptionValue;
};

export type AdminVariant = {
  id: string;
  tenantId: string;
  productId: string;
  sku: string;
  price: Paisa;
  compareAtPrice: Paisa | null;
  costPrice: Paisa | null;
  currency: string;
  stock: number;
  lowStockThreshold: number;
  barcode: string | null;
  weight: number | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  optionValues: AdminVariantOptionValue[];
};

export type AdminProductImage = {
  id: string;
  productId: string;
  variantId: string | null;
  url: string;
  alt: string | null;
  position: number;
};

export type UploadTicketInput = {
  fileName: string;
  contentType: string;
  contentLength: number;
};

export type UploadTicket = {
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
};

export type AttachImageInput = {
  objectKey: string;
  alt?: string;
  variantId?: string | null;
};

export type UpdateImageInput = {
  alt?: string | null;
  variantId?: string | null;
};

export type AdminProductCategory = {
  id: string;
  name: string;
  slug: string;
};

export type AdminProduct = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  brandId: string | null;
  status: ProductStatus;
  categoryId: string | null;
  category: AdminProductCategory | null;
  metaTitle: string | null;
  metaDescription: string | null;
  minPrice: Paisa | null;
  maxPrice: Paisa | null;
  maxDiscountPct: number;
  totalStock: number;
  avgRating: number;
  ratingCount: number;
  soldCount: number;
  createdAt: string;
  updatedAt: string;
  options: AdminProductOption[];
  variants: AdminVariant[];
  images: AdminProductImage[];
};

export type ProductOptionInput = {
  name: string;
  values: string[];
};

export type ProductVariantInput = {
  sku: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  stock?: number;
  lowStockThreshold?: number;
  barcode?: string;
  weight?: number;
  optionValues?: string[];
};

export type ProductImageInput = {
  url: string;
  alt?: string;
};

export type CreateProductInput = {
  name: string;
  slug: string;
  description?: string;
  brandId?: string;
  categoryId?: string;
  status?: ProductStatus;
  metaTitle?: string;
  metaDescription?: string;
  options?: ProductOptionInput[];
  variants: ProductVariantInput[];
  images?: ProductImageInput[];
};

export type UpdateProductInput = Partial<
  Pick<
    CreateProductInput,
    | "name"
    | "slug"
    | "description"
    | "brandId"
    | "categoryId"
    | "status"
    | "metaTitle"
    | "metaDescription"
  >
>;

export type BulkVariantUpdate = {
  id: string;
  sku?: string;
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  stock?: number;
  lowStockThreshold?: number;
  barcode?: string;
  weight?: number;
  optionValues?: string[];
};

export type CreateVariantInput = {
  sku: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  stock?: number;
  lowStockThreshold?: number;
  barcode?: string;
  weight?: number;
  optionValues?: string[];
};
