import type { ApiClient } from "../client";
import type {
  AdminHero,
  AdminHeroSlide,
  CreateHeroSlideInput,
  HeroSettings,
  UpdateHeroSettingsInput,
  UpdateHeroSlideInput,
} from "../hero";
import type {
  AdminSection,
  CreateSectionInput,
  UpdateSectionInput,
} from "../sections";
import type { Paginated } from "../types";
import type {
  AdminBrand,
  AdminCategory,
  AdminCategoryNode,
  AdminCollection,
  AdminCollectionDetail,
  CollectionProductItem,
  CreateBrandInput,
  CreateCategoryInput,
  CreateCollectionInput,
  UpdateBrandInput,
  UpdateCategoryInput,
  UpdateCollectionInput,
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
  AttachImagesInput,
  BulkVariantUpdate,
  CreateProductInput,
  CreateVariantInput,
  ProductStatus,
  StoreSettings,
  UpdateImageInput,
  UpdateStoreSettingsInput,
  UploadTicket,
  UploadTicketInput,
  ScopedUploadTicketInput,
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
        attachMany: (id: string, input: AttachImagesInput) =>
          client.post<AdminProductImage[]>(
            `/admin/products/${id}/images/batch`,
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
    hero: {
      get: () => client.get<AdminHero>("/admin/hero"),
      addSlide: (input: CreateHeroSlideInput) =>
        client.post<AdminHeroSlide>("/admin/hero/slides", input),
      updateSlide: (id: string, input: UpdateHeroSlideInput) =>
        client.patch<AdminHeroSlide>(`/admin/hero/slides/${id}`, input),
      removeSlide: (id: string) =>
        client.delete<void>(`/admin/hero/slides/${id}`),
      reorder: (slideIds: string[]) =>
        client.put<AdminHeroSlide[]>("/admin/hero/slides/order", { slideIds }),
      updateSettings: (input: UpdateHeroSettingsInput) =>
        client.patch<HeroSettings>("/admin/hero/settings", input),
    },
    sections: {
      list: () => client.get<AdminSection[]>("/admin/sections"),
      create: (input: CreateSectionInput) =>
        client.post<AdminSection>("/admin/sections", input),
      update: (id: string, input: UpdateSectionInput) =>
        client.patch<AdminSection>(`/admin/sections/${id}`, input),
      remove: (id: string) => client.delete<void>(`/admin/sections/${id}`),
      reorder: (sectionIds: string[]) =>
        client.put<AdminSection[]>("/admin/sections/order", { sectionIds }),
    },
    settings: {
      get: () => client.get<StoreSettings>("/admin/settings"),
      update: (input: UpdateStoreSettingsInput) =>
        client.patch<StoreSettings>("/admin/settings", input),
    },
    uploads: {
      productImageTicket: (input: UploadTicketInput) =>
        client.post<UploadTicket>("/admin/uploads/product-images", input),
      imageTicket: (input: ScopedUploadTicketInput) =>
        client.post<UploadTicket>("/admin/uploads/images", input),
    },
    categories: {
      list: () => client.get<AdminCategory[]>("/admin/categories"),
      tree: () => client.get<AdminCategoryNode[]>("/admin/categories/tree"),
      create: (input: CreateCategoryInput) =>
        client.post<AdminCategory>("/admin/categories", input),
      update: (id: string, input: UpdateCategoryInput) =>
        client.patch<AdminCategory>(`/admin/categories/${id}`, input),
      remove: (id: string) => client.delete<void>(`/admin/categories/${id}`),
    },
    brands: {
      list: (query: { page?: number; limit?: number } = {}) =>
        client.get<Paginated<AdminBrand>>("/admin/brands", { query }),
      create: (input: CreateBrandInput) =>
        client.post<AdminBrand>("/admin/brands", input),
      update: (id: string, input: UpdateBrandInput) =>
        client.patch<AdminBrand>(`/admin/brands/${id}`, input),
      remove: (id: string) => client.delete<void>(`/admin/brands/${id}`),
    },
    collections: {
      list: (query: { page?: number; limit?: number } = {}) =>
        client.get<Paginated<AdminCollection>>("/admin/collections", { query }),
      create: (input: CreateCollectionInput) =>
        client.post<AdminCollection>("/admin/collections", input),
      update: (id: string, input: UpdateCollectionInput) =>
        client.patch<AdminCollection>(`/admin/collections/${id}`, input),
      remove: (id: string) => client.delete<void>(`/admin/collections/${id}`),
      get: (id: string) =>
        client.get<AdminCollectionDetail>(`/admin/collections/${id}`),
      setProducts: (id: string, products: CollectionProductItem[]) =>
        client.put<AdminCollectionDetail>(
          `/admin/collections/${id}/products`,
          { products },
        ),
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
