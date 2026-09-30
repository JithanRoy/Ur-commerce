import { queryOptions, useQuery, type QueryKey } from "@tanstack/react-query";
import type {
  AdminBrand,
  AdminCategory,
  AdminCategoryNode,
  AdminCollection,
  AdminCollectionDetail,
  CollectionProductItem,
  Paginated,
} from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { queryKeys, type QueryOverrides } from "./query-keys";
import { useApiMutation, type ApiMutationOverrides } from "./use-api-mutation";

const TAXONOMY_LIMIT = 100;
const TAXONOMY_STALE_TIME = 60_000;

export type TaxonomyRow = {
  id: string;
  name: string;
  slug: string;
};

export type TaxonomyInput = {
  name: string;
  slug: string;
};

export type TaxonomyResource<T extends TaxonomyRow> = {
  key: QueryKey;
  list: () => Promise<T[]>;
  create: (input: TaxonomyInput) => Promise<T>;
  remove: (id: string) => Promise<unknown>;
  setImage: (id: string, objectKey: string) => Promise<unknown>;
  clearImage: (id: string) => Promise<unknown>;
};

export const categoryResource: TaxonomyResource<AdminCategory> = {
  key: queryKeys.categories.list(),
  list: () => adminApi.categories.list(),
  create: (input) => adminApi.categories.create(input),
  remove: (id) => adminApi.categories.remove(id),
  setImage: (id, objectKey) =>
    adminApi.categories.update(id, { imageObjectKey: objectKey }),
  clearImage: (id) => adminApi.categories.update(id, { imageUrl: null }),
};

export const brandResource: TaxonomyResource<AdminBrand> = {
  key: queryKeys.brands.list(),
  list: () =>
    adminApi.brands.list({ limit: TAXONOMY_LIMIT }).then((page) => page.items),
  create: (input) => adminApi.brands.create(input),
  remove: (id) => adminApi.brands.remove(id),
  setImage: (id, objectKey) =>
    adminApi.brands.update(id, { logoObjectKey: objectKey }),
  clearImage: (id) => adminApi.brands.update(id, { logoUrl: null }),
};

export const collectionResource: TaxonomyResource<AdminCollection> = {
  key: queryKeys.collections.list(),
  list: () =>
    adminApi.collections
      .list({ limit: TAXONOMY_LIMIT })
      .then((page) => page.items),
  create: (input) => adminApi.collections.create(input),
  remove: (id) => adminApi.collections.remove(id),
  setImage: (id, objectKey) =>
    adminApi.collections.update(id, { imageObjectKey: objectKey }),
  clearImage: (id) => adminApi.collections.update(id, { imageUrl: null }),
};

export function taxonomyListQuery<T extends TaxonomyRow>(
  resource: TaxonomyResource<T>,
) {
  return queryOptions({
    queryKey: resource.key,
    queryFn: resource.list,
  });
}

export function useTaxonomyList<T extends TaxonomyRow>(
  resource: TaxonomyResource<T>,
  options?: QueryOverrides<T[], QueryKey>,
) {
  return useQuery({ ...taxonomyListQuery(resource), ...options });
}

export function useCreateTaxonomyEntry<T extends TaxonomyRow>(
  resource: TaxonomyResource<T>,
  options: ApiMutationOverrides<T, TaxonomyInput> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: resource.create,
    invalidate: [resource.key],
  });
}

export function useDeleteTaxonomyEntry<T extends TaxonomyRow>(
  resource: TaxonomyResource<T>,
  options: ApiMutationOverrides<unknown, string> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: resource.remove,
    invalidate: [resource.key],
  });
}

export type TaxonomyImageInput = { id: string; objectKey: string | null };

export function useTaxonomyImage<T extends TaxonomyRow>(
  resource: TaxonomyResource<T>,
  options: ApiMutationOverrides<unknown, TaxonomyImageInput> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: ({ id, objectKey }: TaxonomyImageInput) =>
      objectKey === null
        ? resource.clearImage(id)
        : resource.setImage(id, objectKey),
    invalidate: [resource.key],
  });
}

export function categoryTreeQuery() {
  return queryOptions({
    queryKey: queryKeys.categories.tree(),
    queryFn: () => adminApi.categories.tree(),
    staleTime: TAXONOMY_STALE_TIME,
  });
}

export function useCategoryTree(
  options?: QueryOverrides<
    AdminCategoryNode[],
    ReturnType<typeof queryKeys.categories.tree>
  >,
) {
  return useQuery({ ...categoryTreeQuery(), ...options });
}

export function brandOptionsQuery() {
  return queryOptions({
    queryKey: queryKeys.brands.options(),
    queryFn: () => adminApi.brands.list({ limit: TAXONOMY_LIMIT }),
    staleTime: TAXONOMY_STALE_TIME,
  });
}

export function useBrandOptions(
  options?: QueryOverrides<
    Paginated<AdminBrand>,
    ReturnType<typeof queryKeys.brands.options>
  >,
) {
  return useQuery({ ...brandOptionsQuery(), ...options });
}

export function collectionDetailQuery(collectionId: string) {
  return queryOptions({
    queryKey: queryKeys.collections.detail(collectionId),
    queryFn: () => adminApi.collections.get(collectionId),
  });
}

export function useCollection(
  collectionId: string,
  options?: QueryOverrides<
    AdminCollectionDetail,
    ReturnType<typeof queryKeys.collections.detail>
  >,
) {
  return useQuery({
    ...collectionDetailQuery(collectionId),
    enabled: Boolean(collectionId),
    ...options,
  });
}

export function useSetCollectionProducts(
  collectionId: string,
  options: ApiMutationOverrides<
    AdminCollectionDetail,
    CollectionProductItem[]
  > = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: (products: CollectionProductItem[]) =>
      adminApi.collections.setProducts(collectionId, products),
    invalidate: [queryKeys.collections.all],
  });
}
