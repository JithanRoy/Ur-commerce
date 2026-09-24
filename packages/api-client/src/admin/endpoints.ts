import type { ApiClient } from "../client";
import type { Paginated } from "../types";
import type {
  AdminBrand,
  AdminCategory,
  AdminCollection,
  CreateBrandInput,
  CreateCategoryInput,
  CreateCollectionInput,
} from "./taxonomy";
import type {
  AdminUser,
  AdminUserQuery,
  CreateStaffInput,
  UpdateStaffInput,
} from "./users";
import type {
  AdminOrder,
  AdminOrderListItem,
  AdminOrderQuery,
  ChangeOrderStatusInput,
  OrderCounts,
} from "./orders";
import type {
  AdminProduct,
  AdminProductImage,
  AdminVariant,
  AttachImageInput,
  BulkVariantUpdate,
  CreateProductInput,
  CreateVariantInput,
  ProductStatus,
  StoreSettings,
  UpdateImageInput,
  UpdateStoreSettingsInput,
  UploadTicket,
  UploadTicketInput,
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
        client.get<Paginated<AdminProduct>>("/admin/products", { query }),
      get: (id: string) => client.get<AdminProduct>(`/admin/products/${id}`),
      create: (input: CreateProductInput) =>
        client.post<AdminProduct>("/admin/products", input),
      update: (id: string, input: UpdateProductInput) =>
        client.patch<AdminProduct>(`/admin/products/${id}`, input),
      archive: (id: string) => client.delete<void>(`/admin/products/${id}`),
      updateVariants: (id: string, variants: BulkVariantUpdate[]) =>
        client.patch<AdminProduct>(`/admin/products/${id}/variants`, {
          variants,
        }),
      addVariant: (id: string, input: CreateVariantInput) =>
        client.post<AdminVariant>(`/admin/products/${id}/variants`, input),
      removeVariant: (id: string, variantId: string) =>
        client.delete<void>(`/admin/products/${id}/variants/${variantId}`),
      images: {
        list: (id: string) =>
          client.get<AdminProductImage[]>(`/admin/products/${id}/images`),
        attach: (id: string, input: AttachImageInput) =>
          client.post<AdminProductImage>(
            `/admin/products/${id}/images`,
            input,
          ),
        reorder: (id: string, imageIds: string[]) =>
          client.put<AdminProductImage[]>(
            `/admin/products/${id}/images/order`,
            { imageIds },
          ),
        update: (id: string, imageId: string, input: UpdateImageInput) =>
          client.patch<AdminProductImage>(
            `/admin/products/${id}/images/${imageId}`,
            input,
          ),
        remove: (id: string, imageId: string) =>
          client.delete<void>(`/admin/products/${id}/images/${imageId}`),
      },
    },
    settings: {
      get: () => client.get<StoreSettings>("/admin/settings"),
      update: (input: UpdateStoreSettingsInput) =>
        client.patch<StoreSettings>("/admin/settings", input),
    },
    uploads: {
      productImageTicket: (input: UploadTicketInput) =>
        client.post<UploadTicket>("/admin/uploads/product-images", input),
    },
    categories: {
      list: () => client.get<AdminCategory[]>("/admin/categories"),
      create: (input: CreateCategoryInput) =>
        client.post<AdminCategory>("/admin/categories", input),
      update: (id: string, input: Partial<CreateCategoryInput>) =>
        client.patch<AdminCategory>(`/admin/categories/${id}`, input),
      remove: (id: string) => client.delete<void>(`/admin/categories/${id}`),
    },
    brands: {
      list: (query: { page?: number; limit?: number } = {}) =>
        client.get<Paginated<AdminBrand>>("/admin/brands", { query }),
      create: (input: CreateBrandInput) =>
        client.post<AdminBrand>("/admin/brands", input),
      update: (id: string, input: Partial<CreateBrandInput>) =>
        client.patch<AdminBrand>(`/admin/brands/${id}`, input),
      remove: (id: string) => client.delete<void>(`/admin/brands/${id}`),
    },
    collections: {
      list: (query: { page?: number; limit?: number } = {}) =>
        client.get<Paginated<AdminCollection>>("/admin/collections", { query }),
      create: (input: CreateCollectionInput) =>
        client.post<AdminCollection>("/admin/collections", input),
      update: (id: string, input: Partial<CreateCollectionInput>) =>
        client.patch<AdminCollection>(`/admin/collections/${id}`, input),
      remove: (id: string) => client.delete<void>(`/admin/collections/${id}`),
    },
    users: {
      list: (query: AdminUserQuery = {}) =>
        client.get<Paginated<AdminUser>>("/admin/users", { query }),
      create: (input: CreateStaffInput) =>
        client.post<AdminUser>("/admin/users", input),
      update: (id: string, input: UpdateStaffInput) =>
        client.patch<AdminUser>(`/admin/users/${id}`, input),
      deactivate: (id: string) => client.delete<void>(`/admin/users/${id}`),
    },
    orders: {
      list: (query: AdminOrderQuery = {}) =>
        client.get<Paginated<AdminOrderListItem>>("/admin/orders", { query }),
      counts: () => client.get<OrderCounts>("/admin/orders/counts"),
      get: (id: string) => client.get<AdminOrder>(`/admin/orders/${id}`),
      changeStatus: (id: string, input: ChangeOrderStatusInput) =>
        client.patch<AdminOrder>(`/admin/orders/${id}/status`, input),
    },
  };
}

export type AdminApi = ReturnType<typeof createAdminApi>;
