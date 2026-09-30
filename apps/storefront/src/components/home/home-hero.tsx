import type { Hero } from "@urcommerce/api-client";
import { HeroAssurances, StaticHero } from "./hero";
import { HeroCarousel } from "./hero-carousel";

export function HomeHero({
  hero,
  storeName,
  tagline,
}: {
  hero: Hero | null;
  storeName: string;
  tagline?: string | null;
}) {
  const fallback = <StaticHero storeName={storeName} tagline={tagline} />;
  if (!hero?.slides?.length) return fallback;

  return (
    <HeroCarousel hero={hero} fallback={fallback} footer={<HeroAssurances />} />
  );
}
