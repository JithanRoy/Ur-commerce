import type { Paisa } from "../money";

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type AdminOptionValue = {
  id: string;
  value: string;
  position: number;
};

export type AdminProductOption = {
  id: string;
  name: string;
  position: number;
  values: AdminOptionValue[];
};

export type AdminVariant = {
  id: string;
  sku: string;
  price: Paisa;
  compareAtPrice: Paisa | null;
  costPrice: Paisa | null;
  stock: number;
  optionValues: { optionValue: AdminOptionValue & { option: { name: string; position: number } } }[];
};

export type AdminProductImage = {
  id: string;
  url: string;
  alt: string | null;
  position: number;
};

export type AdminProductListItem = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  minPrice: Paisa | null;
  maxPrice: Paisa | null;
  totalStock: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminProduct = AdminProductListItem & {
  description: string | null;
  categoryId: string | null;
  brandId: string | null;
  tenantId: string;
  options: AdminProductOption[];
  variants: AdminVariant[];
  images: AdminProductImage[];
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  position: number;
  productCount?: number;
};

export type AdminBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

export type CreateProductInput = {
  name: string;
  slug: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  status: ProductStatus;
  options: {
    name: string;
    position: number;
    values: { value: string; position: number }[];
  }[];
  variants: {
    sku: string;
    price: number;
    compareAtPrice?: number;
    costPrice?: number;
    stock: number;
    optionValues: string[];
  }[];
  images?: { url: string; alt?: string; position: number }[];
};

export type UpdateProductInput = Partial<
  Pick<CreateProductInput, "name" | "slug" | "description" | "categoryId" | "brandId" | "status">
>;
