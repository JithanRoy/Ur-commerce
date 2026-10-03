import { FolderTree, GalleryHorizontalEnd, Tag } from "lucide-react";
import {
  SECTION_MAX_ITEMS,
  SECTION_MIN_ITEMS,
  SECTION_SOURCES,
} from "@urcommerce/api-client";
import type { SectionKind, SectionSource } from "@urcommerce/api-client";
import type { SelectOption } from "@/components/ui/input";

export const KIND_DETAILS: Record<
  SectionKind,
  { label: string; description: string; itemNoun: string; icon: typeof Tag }
> = {
  PRODUCT_CAROUSEL: {
    label: "Product row",
    description: "A scrolling row of products — newest, best sellers, deals.",
    itemNoun: "products",
    icon: GalleryHorizontalEnd,
  },
  CATEGORY_GRID: {
    label: "Category grid",
    description: "Tiles for your categories, so shoppers can jump straight in.",
    itemNoun: "categories",
    icon: FolderTree,
  },
  BRAND_STRIP: {
    label: "Brand strip",
    description: "Your brands, ordered by how many products each has.",
    itemNoun: "brands",
    icon: Tag,
  },
};

export const KIND_ORDER: SectionKind[] = [
  "PRODUCT_CAROUSEL",
  "CATEGORY_GRID",
  "BRAND_STRIP",
];

export const SOURCE_LABELS: Record<SectionSource, string> = {
  NEWEST: "Newest first",
  BEST_SELLERS: "Best sellers",
  DISCOUNT: "Biggest discount",
  PRICE_ASC: "Lowest price",
  PRICE_DESC: "Highest price",
};

export const SOURCE_TITLES: Record<SectionSource, string> = {
  NEWEST: "New Arrivals",
  BEST_SELLERS: "Popular",
  DISCOUNT: "Hot Deals",
  PRICE_ASC: "Budget Picks",
  PRICE_DESC: "Premium Picks",
};

export const BEST_SELLERS_HINT =
  "Ranked by units sold. On a new store most products have no sales yet, so the order settles as orders come in.";

export const SOURCE_OPTIONS: SelectOption[] = SECTION_SOURCES.map(
  (source) => ({ value: source, label: SOURCE_LABELS[source] }),
);

const ITEM_LIMIT_PRESETS = [4, 6, 8, 10, 12, 16, 20, 24];

export function itemLimitOptions(
  current: number,
  noun: string,
): SelectOption[] {
  const inRange = current >= SECTION_MIN_ITEMS && current <= SECTION_MAX_ITEMS;
  const values =
    ITEM_LIMIT_PRESETS.includes(current) || !inRange
      ? ITEM_LIMIT_PRESETS
      : [...ITEM_LIMIT_PRESETS, current].sort((a, b) => a - b);
  return values.map((value) => ({
    value: String(value),
    label: `Up to ${value} ${noun}`,
  }));
}

export function isSectionSource(value: string): value is SectionSource {
  return (SECTION_SOURCES as readonly string[]).includes(value);
}
