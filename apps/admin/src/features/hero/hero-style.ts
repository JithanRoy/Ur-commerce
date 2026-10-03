import type { AdminHeroSlide, HeroStyle } from "@urcommerce/api-client";

export type HeroStyleChoice = {
  style: HeroStyle;
  title: string;
  description: string;
};

export const HERO_STYLE_CHOICES: readonly HeroStyleChoice[] = [
  {
    style: "CAROUSEL",
    title: "Image slideshow",
    description: "Your uploaded banner slides, one after another.",
  },
  {
    style: "STATIC",
    title: "Headline & buttons",
    description: "A headline, two buttons and short badges. No banner needed.",
  },
  {
    style: "OFF",
    title: "No hero",
    description: "Your homepage starts straight with its products.",
  },
];

export function heroStyleTitle(style: HeroStyle): string {
  return (
    HERO_STYLE_CHOICES.find((choice) => choice.style === style)?.title ?? style
  );
}

function isWithinSchedule(slide: AdminHeroSlide, now: number): boolean {
  const started = !slide.startsAt || Date.parse(slide.startsAt) <= now;
  const notEnded = !slide.endsAt || Date.parse(slide.endsAt) > now;
  return started && notEnded;
}

export function visibleSlideCount(
  slides: AdminHeroSlide[],
  now = Date.now(),
): number {
  return slides.filter((slide) => slide.isActive && isWithinSchedule(slide, now))
    .length;
}

export function liveHeroStyle(
  style: HeroStyle,
  slides: AdminHeroSlide[],
): HeroStyle {
  if (style === "CAROUSEL" && visibleSlideCount(slides) === 0) return "STATIC";
  return style;
}
