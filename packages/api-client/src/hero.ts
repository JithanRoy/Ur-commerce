export type HeroSlide = {
  id: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  alt: string | null;
  position: number;
};

export type Hero = {
  autoplay: boolean;
  intervalMs: number;
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

export type AdminHero = Omit<Hero, "slides"> & {
  slides: AdminHeroSlide[];
};

export type CreateHeroSlideInput = {
  imageObjectKey: string;
  alt?: string | null;
};

export type UpdateHeroSlideInput = {
  alt?: string | null;
};

export type UpdateHeroSettingsInput = {
  heroAutoplay?: boolean;
  heroIntervalMs?: number;
};

export type HeroSettings = Pick<Hero, "autoplay" | "intervalMs">;

export const HERO_MAX_SLIDES = 10;
export const HERO_INTERVAL_MIN_MS = 2000;
export const HERO_INTERVAL_MAX_MS = 30000;
export const HERO_ALT_MAX_LENGTH = 200;
