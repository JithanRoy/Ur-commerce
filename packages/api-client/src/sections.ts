export const SECTION_KINDS = [
  "CATEGORY_GRID",
  "BRAND_STRIP",
  "PRODUCT_CAROUSEL",
] as const;

export const SECTION_SOURCES = [
  "NEWEST",
  "BEST_SELLERS",
  "DISCOUNT",
  "PRICE_ASC",
  "PRICE_DESC",
] as const;

export type SectionKind = (typeof SECTION_KINDS)[number];
export type SectionSource = (typeof SECTION_SOURCES)[number];

export const SECTION_MIN_ITEMS = 4;
export const SECTION_MAX_ITEMS = 24;
export const SECTION_MAX_COUNT = 12;
export const SECTION_TITLE_MAX_LENGTH = 60;

export function sectionNeedsSource(kind: SectionKind): boolean {
  return kind === "PRODUCT_CAROUSEL";
}

export function isSingletonSectionKind(kind: SectionKind): boolean {
  return kind !== "PRODUCT_CAROUSEL";
}

export type AdminSection = {
  id: string;
  kind: SectionKind;
  title: string;
  source: SectionSource | null;
  itemLimit: number;
  position: number;
  isActive: boolean;
};

export type CreateSectionInput = {
  kind: SectionKind;
  title?: string;
  source?: SectionSource;
  itemLimit?: number;
  isActive?: boolean;
};

export type UpdateSectionInput = {
  title?: string;
  source?: SectionSource;
  itemLimit?: number;
  isActive?: boolean;
};
