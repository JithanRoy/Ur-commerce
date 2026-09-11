import type { HomeSection } from "@urcommerce/api-client";
import { BrandStrip, CategoryGrid, ProductCarousel } from "./sections";

export function SectionRenderer({ sections }: { sections: HomeSection[] }) {
  return (
    <>
      {sections.map((section, index) => {
        const key = `${section.type}-${index}`;
        switch (section.type) {
          case "CATEGORY_GRID":
            return <CategoryGrid key={key} section={section} />;
          case "PRODUCT_CAROUSEL":
            return <ProductCarousel key={key} section={section} />;
          case "BRAND_STRIP":
            return <BrandStrip key={key} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
