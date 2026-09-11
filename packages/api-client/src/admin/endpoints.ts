import type { ApiClient } from "../client";
import type { Paginated } from "../types";
import type {
  AdminBrand,
  AdminCategory,
  AdminProduct,
  AdminProductListItem,
  CreateProductInput,
  ProductStatus,
  UpdateProductInput,
} from "./types";

export type AdminProductQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
};

export function createAdminApi(client: ApiClient) {
  return {
    products: {
      list: (query: AdminProductQuery = {}) =>
        client.get<Paginated<AdminProductListItem>>("/admin/products", { query }),
      get: (id: string) => client.get<AdminProduct>(`/admin/products/${id}`),
      create: (input: CreateProductInput) =>
        client.post<AdminProduct>("/admin/products", input),
      update: (id: string, input: UpdateProductInput) =>
        client.patch<AdminProduct>(`/admin/products/${id}`, input),
      archive: (id: string) => client.delete<void>(`/admin/products/${id}`),
    },
    categories: {
      list: () => client.get<AdminCategory[]>("/admin/categories"),
      tree: () => client.get<AdminCategory[]>("/admin/categories/tree"),
    },
    brands: {
      list: () => client.get<AdminBrand[]>("/admin/brands"),
    },
  };
}

export type AdminApi = ReturnType<typeof createAdminApi>;
