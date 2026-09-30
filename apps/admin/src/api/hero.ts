import {
  queryOptions,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type {
  AdminHero,
  AdminHeroSlide,
  CreateHeroSlideInput,
  HeroSettings,
  UpdateHeroSettingsInput,
} from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { mutationKeys, queryKeys, type QueryOverrides } from "./query-keys";
import { useApiMutation, type ApiMutationOverrides } from "./use-api-mutation";

type HeroKey = ReturnType<typeof queryKeys.hero.detail>;

export type UpdateHeroSlideVariables = { slideId: string; alt: string | null };

type ReorderSnapshot = { previous: AdminHero | undefined };

export function heroQuery() {
  return queryOptions({
    queryKey: queryKeys.hero.detail(),
    queryFn: () => adminApi.hero.get(),
    retry: false,
  });
}

export function useHero(options?: QueryOverrides<AdminHero, HeroKey>) {
  return useQuery({ ...heroQuery(), ...options });
}

function patchHero(
  queryClient: QueryClient,
  update: (hero: AdminHero) => AdminHero,
) {
  queryClient.setQueryData<AdminHero>(queryKeys.hero.detail(), (hero) =>
    hero ? update(hero) : hero,
  );
}

function orderSlides(
  slides: AdminHeroSlide[],
  slideIds: string[],
): AdminHeroSlide[] {
  const byId = new Map(slides.map((slide) => [slide.id, slide]));
  return slideIds.flatMap((id, position) => {
    const slide = byId.get(id);
    return slide ? [{ ...slide, position }] : [];
  });
}

export function useAddHeroSlide(
  options: ApiMutationOverrides<AdminHeroSlide, CreateHeroSlideInput> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: (input: CreateHeroSlideInput) => adminApi.hero.addSlide(input),
    invalidate: [queryKeys.hero.all],
  });
}

export function useUpdateHeroSlide(
  options: ApiMutationOverrides<AdminHeroSlide, UpdateHeroSlideVariables> = {},
) {
  const queryClient = useQueryClient();
  return useApiMutation({
    ...options,
    mutationFn: ({ slideId, alt }: UpdateHeroSlideVariables) =>
      adminApi.hero.updateSlide(slideId, { alt }),
    onSuccess: (updated, variables, onMutateResult, context) => {
      patchHero(queryClient, (hero) => ({
        ...hero,
        slides: hero.slides.map((slide) =>
          slide.id === updated.id ? { ...slide, alt: updated.alt } : slide,
        ),
      }));
      return options.onSuccess?.(updated, variables, onMutateResult, context);
    },
    invalidate: [queryKeys.hero.all],
  });
}

export function useRemoveHeroSlide(
  options: ApiMutationOverrides<void, string> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: (slideId: string) => adminApi.hero.removeSlide(slideId),
    invalidate: [queryKeys.hero.all],
    awaitInvalidate: true,
  });
}

export function useReorderHeroSlides(
  options: ApiMutationOverrides<
    AdminHeroSlide[],
    string[],
    ReorderSnapshot
  > = {},
) {
  const queryClient = useQueryClient();
  const isLastReorderInFlight = () =>
    queryClient.isMutating({ mutationKey: mutationKeys.hero.reorder() }) <= 1;

  return useApiMutation<AdminHeroSlide[], string[], ReorderSnapshot>({
    ...options,
    mutationKey: mutationKeys.hero.reorder(),
    mutationFn: (slideIds: string[]) => adminApi.hero.reorder(slideIds),
    onMutate: async (slideIds) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.hero.all });
      const previous = queryClient.getQueryData<AdminHero>(
        queryKeys.hero.detail(),
      );
      patchHero(queryClient, (hero) => ({
        ...hero,
        slides: orderSlides(hero.slides, slideIds),
      }));
      return { previous };
    },
    onSuccess: (slides, variables, onMutateResult, context) => {
      if (isLastReorderInFlight()) {
        patchHero(queryClient, (hero) => ({ ...hero, slides }));
      }
      return options.onSuccess?.(slides, variables, onMutateResult, context);
    },
    onSettled: (_slides, error, _variables, snapshot) => {
      if (error && snapshot?.previous) {
        queryClient.setQueryData(queryKeys.hero.detail(), snapshot.previous);
      }
      if (isLastReorderInFlight()) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.hero.all });
      }
    },
  });
}

export function useUpdateHeroSettings(
  options: ApiMutationOverrides<HeroSettings, UpdateHeroSettingsInput> = {},
) {
  const queryClient = useQueryClient();
  return useApiMutation({
    ...options,
    mutationFn: (input: UpdateHeroSettingsInput) =>
      adminApi.hero.updateSettings(input),
    onSuccess: (settings, variables, onMutateResult, context) => {
      patchHero(queryClient, (hero) => ({ ...hero, ...settings }));
      return options.onSuccess?.(settings, variables, onMutateResult, context);
    },
    invalidate: [queryKeys.hero.all],
  });
}
