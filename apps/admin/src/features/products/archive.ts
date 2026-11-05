import type { ProductStatus } from "@urcommerce/api-client";

const ARCHIVED_ENDING = /-archived-[0-9a-f-]{36}$/;

export function withoutArchivedEnding(value: string): string {
  return value.replace(ARCHIVED_ENDING, "");
}

export function isArchivedIdentifier(value: string): boolean {
  return ARCHIVED_ENDING.test(value);
}

export function statusHint(
  saved: ProductStatus,
  chosen: ProductStatus,
): string | undefined {
  if (saved !== "ARCHIVED" && chosen === "ARCHIVED") {
    return "Archiving hides it from the shop and frees its address and SKUs for a new product: they get “-archived-…” added when you save.";
  }
  if (saved === "ARCHIVED" && chosen !== "ARCHIVED") {
    return "Saving restores its original address and SKUs, unless another product has taken them since.";
  }
  if (saved === "ARCHIVED") {
    return "Hidden from the shop. Its address and SKUs end in “-archived-…” so new products can use the originals.";
  }
  return undefined;
}
