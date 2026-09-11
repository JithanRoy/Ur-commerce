import { Hero } from "@/components/home/hero";
import { EmptyStorefront } from "@/components/home/empty-storefront";
import { StorefrontUnavailable } from "@/components/home/storefront-unavailable";
import { SectionRenderer } from "@/components/home/section-renderer";
import { api } from "@/lib/api";
import { defaultTheme } from "@/lib/theme";
import type { HomeResponse } from "@urcommerce/api-client";

export const revalidate = 60;

type HomeState =
  | { status: "loaded"; home: HomeResponse }
  | { status: "unavailable" };

async function loadHome(): Promise<HomeState> {
  try {
    return { status: "loaded", home: await api.get<HomeResponse>("/home") };
  } catch (error) {
    console.error("GET /home failed", error);
    return { status: "unavailable" };
  }
}

export default async function HomePage() {
  const state = await loadHome();

  return (
    <main>
      <Hero storeName={defaultTheme.name} />
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
