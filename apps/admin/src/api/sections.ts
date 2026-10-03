import {
  queryOptions,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type {
  AdminSection,
  CreateSectionInput,
  UpdateSectionInput,
} from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { mutationKeys, queryKeys, type QueryOverrides } from "./query-keys";
import { useApiMutation, type ApiMutationOverrides } from "./use-api-mutation";

type SectionsKey = ReturnType<typeof queryKeys.sections.list>;

export type UpdateSectionVariables = {
  sectionId: string;
  input: UpdateSectionInput;
};

type ReorderSnapshot = { previous: AdminSection[] | undefined };

export function sectionsQuery() {
  return queryOptions({
    queryKey: queryKeys.sections.list(),
    queryFn: () => adminApi.sections.list(),
    retry: false,
  });
}

export function useSections(
  options?: QueryOverrides<AdminSection[], SectionsKey>,
) {
  return useQuery({ ...sectionsQuery(), ...options });
}

function patchSections(
  queryClient: QueryClient,
  update: (sections: AdminSection[]) => AdminSection[],
) {
  queryClient.setQueryData<AdminSection[]>(
    queryKeys.sections.list(),
    (sections) => (sections ? update(sections) : sections),
  );
}

function orderSections(
  sections: AdminSection[],
  sectionIds: string[],
): AdminSection[] {
  const byId = new Map(sections.map((section) => [section.id, section]));
  return sectionIds.flatMap((id, position) => {
    const section = byId.get(id);
    return section ? [{ ...section, position }] : [];
  });
}

export function useAddSection(
  options: ApiMutationOverrides<AdminSection, CreateSectionInput> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: (input: CreateSectionInput) => adminApi.sections.create(input),
    invalidate: [queryKeys.sections.all],
    awaitInvalidate: true,
  });
}

export function useUpdateSection(
  options: ApiMutationOverrides<AdminSection, UpdateSectionVariables> = {},
) {
  const queryClient = useQueryClient();
  return useApiMutation({
    ...options,
    mutationFn: ({ sectionId, input }: UpdateSectionVariables) =>
      adminApi.sections.update(sectionId, input),
    onSuccess: (updated, variables, onMutateResult, context) => {
      patchSections(queryClient, (sections) =>
        sections.map((section) =>
          section.id === updated.id ? { ...section, ...updated } : section,
        ),
      );
      return options.onSuccess?.(updated, variables, onMutateResult, context);
    },
    invalidate: [queryKeys.sections.all],
  });
}

export function useRemoveSection(
  options: ApiMutationOverrides<void, string> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: (sectionId: string) => adminApi.sections.remove(sectionId),
    invalidate: [queryKeys.sections.all],
    awaitInvalidate: true,
  });
}

export function useReorderSections(
  options: ApiMutationOverrides<
    AdminSection[],
    string[],
    ReorderSnapshot
  > = {},
) {
  const queryClient = useQueryClient();
  const isLastReorderInFlight = () =>
    queryClient.isMutating({
      mutationKey: mutationKeys.sections.reorder(),
    }) <= 1;

  return useApiMutation<AdminSection[], string[], ReorderSnapshot>({
    ...options,
    mutationKey: mutationKeys.sections.reorder(),
    mutationFn: (sectionIds: string[]) => adminApi.sections.reorder(sectionIds),
    onMutate: async (sectionIds) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sections.all });
      const previous = queryClient.getQueryData<AdminSection[]>(
        queryKeys.sections.list(),
      );
      patchSections(queryClient, (sections) =>
        orderSections(sections, sectionIds),
      );
      return { previous };
    },
    onSuccess: (sections, variables, onMutateResult, context) => {
      if (isLastReorderInFlight()) {
        queryClient.setQueryData(queryKeys.sections.list(), sections);
      }
      return options.onSuccess?.(sections, variables, onMutateResult, context);
    },
    onSettled: (_sections, error, _variables, snapshot) => {
      if (error && snapshot?.previous) {
        queryClient.setQueryData(queryKeys.sections.list(), snapshot.previous);
      }
      if (isLastReorderInFlight()) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.sections.all });
      }
    },
  });
}
