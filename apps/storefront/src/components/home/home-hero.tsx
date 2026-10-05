import type { Hero } from "@urcommerce/api-client";
import { StaticHero } from "./hero";
import { HeroCarousel } from "./hero-carousel";

export function HomeHero({
  hero,
  storeName,
  tagline,
  brandsEnabled = true,
}: {
  hero: Hero | null;
  storeName: string;
  tagline?: string | null;
  brandsEnabled?: boolean;
}) {
  if (hero?.style === "OFF") return null;

  const fallback = (
    <StaticHero
      content={hero?.static ?? null}
      storeName={storeName}
      tagline={tagline}
      brandsEnabled={brandsEnabled}
    />
  );
  if (hero?.style !== "CAROUSEL" || !hero.slides.length) return fallback;

  return <HeroCarousel hero={hero} fallback={fallback} />;
}
