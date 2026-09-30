import {
  queryOptions,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type {
  AdminProduct,
  AdminProductImage,
  AdminVariant,
  AttachImageInput,
  BulkVariantUpdate,
  CreateProductInput,
  CreateVariantInput,
  Paginated,
  UpdateProductInput,
} from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { ProductEditRoute } from "@/routes/lazy";
import {
  productQueriesExcept,
  queryKeys,
  type ProductListParams,
  type QueryOverrides,
} from "./query-keys";
import {
  useApiMutation,
  useApiRequest,
  type ApiMutationOverrides,
} from "./use-api-mutation";

const PRODUCT_PAGE_SIZE = 20;
const CATALOGUE_LIMIT = 100;

export function productListQuery(params: ProductListParams) {
  return queryOptions({
    queryKey: queryKeys.products.list(params),
    queryFn: () =>
      adminApi.products.list({
        page: params.page,
        limit: PRODUCT_PAGE_SIZE,
        ...(params.search ? { search: params.search } : {}),
        ...(params.status ? { status: params.status } : {}),
      }),
  });
}

export function productDetailQuery(productId: string) {
  return queryOptions({
    queryKey: queryKeys.products.detail(productId),
    queryFn: () => adminApi.products.get(productId),
  });
}

export function productImagesQuery(productId: string) {
  return queryOptions({
    queryKey: queryKeys.products.images(productId),
    queryFn: () => adminApi.products.images.list(productId),
  });
}

export function collectionCatalogueQuery() {
  return queryOptions({
    queryKey: queryKeys.products.collectionCatalogue(),
    queryFn: () => adminApi.products.list({ limit: CATALOGUE_LIMIT }),
  });
}

function isProductPage(value: unknown): value is Paginated<AdminProduct> {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    Array.isArray(value.items)
  );
}

export function findProductInLists(
  queryClient: QueryClient,
  productId: string,
): AdminProduct | undefined {
  for (const [, data] of queryClient.getQueriesData({
    queryKey: queryKeys.products.all,
  })) {
    if (!isProductPage(data)) continue;
    const match = data.items.find((product) => product.id === productId);
    if (match) return match;
  }
  return undefined;
}

export function useProducts<TData = Paginated<AdminProduct>>(
  params: ProductListParams,
  options?: QueryOverrides<
    Paginated<AdminProduct>,
    ReturnType<typeof queryKeys.products.list>,
    TData
  >,
) {
  return useQuery({
    ...productListQuery(params),
    ...options,
    select: options?.select,
  });
}

export function useProduct(
  productId: string,
  options?: QueryOverrides<
    AdminProduct,
    ReturnType<typeof queryKeys.products.detail>
  >,
) {
  const queryClient = useQueryClient();
  return useQuery({
    ...productDetailQuery(productId),
    enabled: Boolean(productId),
    placeholderData: () => findProductInLists(queryClient, productId),
    ...options,
  });
}

export function useProductImages(
  productId: string,
  options?: QueryOverrides<
    AdminProductImage[],
    ReturnType<typeof queryKeys.products.images>
  >,
) {
  return useQuery({ ...productImagesQuery(productId), ...options });
}

export function useCollectionCatalogue<TData = Paginated<AdminProduct>>(
  options?: QueryOverrides<
    Paginated<AdminProduct>,
    ReturnType<typeof queryKeys.products.collectionCatalogue>,
    TData
  >,
) {
  return useQuery({
    ...collectionCatalogueQuery(),
    ...options,
    select: options?.select,
  });
}

export function usePrefetchProductDetail() {
  const queryClient = useQueryClient();
  return (productId: string) => {
    void ProductEditRoute.preload();
    void queryClient.prefetchQuery(productDetailQuery(productId));
  };
}

export function useCreateProduct(
  options: ApiMutationOverrides<AdminProduct, CreateProductInput> = {},
) {
  return useApiMutation({
    invalidate: [queryKeys.products.all],
    ...options,
    mutationFn: (input: CreateProductInput) => adminApi.products.create(input),
  });
}

function useStoreProduct(productId: string) {
  const queryClient = useQueryClient();
  return (product: AdminProduct) => {
    queryClient.setQueryData(productDetailQuery(productId).queryKey, product);
  };
}

export function useUpdateProduct(
  productId: string,
  options: ApiMutationOverrides<AdminProduct, UpdateProductInput> = {},
) {
  const storeProduct = useStoreProduct(productId);
  return useApiMutation({
    ...options,
    mutationFn: (input: UpdateProductInput) =>
      adminApi.products.update(productId, input),
    invalidate: [productQueriesExcept(productId)],
    onSuccess: (updated, ...rest) => {
      storeProduct(updated);
      return options.onSuccess?.(updated, ...rest);
    },
  });
}

export function useUpdateVariants(
  productId: string,
  options: ApiMutationOverrides<AdminProduct, BulkVariantUpdate[]> = {},
) {
  const storeProduct = useStoreProduct(productId);
  return useApiMutation({
    ...options,
    mutationFn: (variants: BulkVariantUpdate[]) =>
      adminApi.products.updateVariants(productId, variants),
    invalidate: [productQueriesExcept(productId)],
    onSuccess: (updated, ...rest) => {
      storeProduct(updated);
      return options.onSuccess?.(updated, ...rest);
    },
  });
}

function variantChangeInvalidations(productId: string) {
  return [
    queryKeys.products.detail(productId),
    productQueriesExcept(productId),
  ];
}

export function useAddVariant(
  productId: string,
  options: ApiMutationOverrides<AdminVariant, CreateVariantInput> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: (input: CreateVariantInput) =>
      adminApi.products.addVariant(productId, input),
    invalidate: variantChangeInvalidations(productId),
  });
}

export function useRemoveVariant(
  productId: string,
  options: ApiMutationOverrides<void, string> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: (variantId: string) =>
      adminApi.products.removeVariant(productId, variantId),
    invalidate: variantChangeInvalidations(productId),
  });
}

export function useAttachProductImages(productId: string) {
  return useApiRequest(async (images: AttachImageInput[]) => {
    const [only] = images;
    if (images.length === 1 && only) {
      await adminApi.products.images.attach(productId, only);
      return;
    }
    await adminApi.products.images.attachMany(productId, { images });
  });
}

export function useRefreshProductImages(productId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.products.images(productId),
    });
}

export function useReorderProductImages(
  productId: string,
  options: ApiMutationOverrides<AdminProductImage[], string[]> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: (imageIds: string[]) =>
      adminApi.products.images.reorder(productId, imageIds),
    invalidate: [queryKeys.products.images(productId)],
    awaitInvalidate: true,
  });
}

export type PinImageInput = { imageId: string; variantId: string | null };

export function usePinProductImage(
  productId: string,
  options: ApiMutationOverrides<AdminProductImage, PinImageInput> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: ({ imageId, variantId }: PinImageInput) =>
      adminApi.products.images.update(productId, imageId, { variantId }),
    invalidate: [queryKeys.products.images(productId)],
    awaitInvalidate: true,
  });
}

export function useRemoveProductImage(
  productId: string,
  options: ApiMutationOverrides<void, string> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: (imageId: string) =>
      adminApi.products.images.remove(productId, imageId),
    invalidate: [queryKeys.products.images(productId)],
  });
}
