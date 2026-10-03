export type HeroSlide = {
  id: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  alt: string | null;
  eyebrow: string | null;
  headline: string | null;
  subheadline: string | null;
  primaryLabel: string | null;
  primaryUrl: string | null;
  secondaryLabel: string | null;
  secondaryUrl: string | null;
  position: number;
};

export type HeroStyle = "STATIC" | "CAROUSEL" | "OFF";

export type StaticHeroContent = {
  eyebrow: string | null;
  headline: string | null;
  subheadline: string | null;
  primaryLabel: string | null;
  primaryUrl: string | null;
  secondaryLabel: string | null;
  secondaryUrl: string | null;
  imageUrl: string | null;
  badges: string[];
};

export type Hero = {
  style: HeroStyle;
  autoplay: boolean;
  intervalMs: number;
  static: StaticHeroContent | null;
  slides: HeroSlide[];
};

export type AdminHeroSlide = HeroSlide & {
  imageObjectKey: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminHero = Omit<Hero, "slides" | "static"> & {
  static: StaticHeroContent;
  slides: AdminHeroSlide[];
};

export type CreateHeroSlideInput = {
  imageObjectKey: string;
  mobileImageObjectKey?: string;
  alt?: string | null;
};

export type UpdateHeroSlideInput = {
  alt?: string | null;
  mobileImageObjectKey?: string;
  mobileImageUrl?: null;
};

export type UpdateHeroSettingsInput = {
  heroStyle?: HeroStyle;
  heroAutoplay?: boolean;
  heroIntervalMs?: number;
  heroHeadline?: string | null;
  heroPrimaryLabel?: string | null;
  heroPrimaryUrl?: string | null;
  heroSecondaryLabel?: string | null;
  heroSecondaryUrl?: string | null;
  heroImageObjectKey?: string;
  heroImageUrl?: null;
  heroBadges?: string[];
};

export type HeroSettings = Omit<AdminHero, "slides">;

export const HERO_STYLES: readonly HeroStyle[] = ["STATIC", "CAROUSEL", "OFF"];
export const HERO_MAX_BADGES = 4;
export const HERO_BADGE_MAX_LENGTH = 40;
export const HERO_HEADLINE_MAX_LENGTH = 120;
export const HERO_BUTTON_LABEL_MAX_LENGTH = 40;

export const HERO_MAX_SLIDES = 10;
export const HERO_INTERVAL_MIN_MS = 2000;
export const HERO_INTERVAL_MAX_MS = 30000;
export const HERO_ALT_MAX_LENGTH = 200;
