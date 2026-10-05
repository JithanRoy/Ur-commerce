import { HomeHero } from "@/components/home/home-hero";
import { EmptyStorefront } from "@/components/home/empty-storefront";
import { StorefrontUnavailable } from "@/components/home/storefront-unavailable";
import { SectionRenderer } from "@/components/home/section-renderer";
import { api } from "@/lib/api";
import { brandsEnabledFor, loadStoreTheme } from "@/lib/load-store";
import type { HomeResponse } from "@urcommerce/api-client";

export const revalidate = 60;

type HomeState =
  { status: "loaded"; home: HomeResponse } | { status: "unavailable" };

async function loadHome(): Promise<HomeState> {
  try {
    return { status: "loaded", home: await api.get<HomeResponse>("/home") };
  } catch (error) {
    console.error("GET /home failed", error);
    return { status: "unavailable" };
  }
}

export default async function HomePage() {
  const [state, { store, theme }] = await Promise.all([
    loadHome(),
    loadStoreTheme(),
  ]);

  return (
    <main>
      <HomeHero
        hero={state.status === "loaded" ? state.home.hero : null}
        storeName={theme.name}
        tagline={theme.tagline}
        brandsEnabled={brandsEnabledFor(store)}
      />
      {state.status === "unavailable" ? (
        <StorefrontUnavailable />
      ) : state.home.sections.length === 0 ? (
        <EmptyStorefront />
      ) : (
        <SectionRenderer sections={state.home.sections} />
      )}
    </main>
  );
}
