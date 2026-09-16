import type {
  ProductDetail,
  ProductDetailVariant,
} from "@urcommerce/api-client";

export type Selection = Record<string, string>;

export function optionNamesInOrder(product: ProductDetail): string[] {
  const positionByName = new Map<string, number>();
  for (const variant of product.variants) {
    for (const link of variant.optionValues) {
      positionByName.set(link.optionValue.option.name, link.optionValue.option.position);
    }
  }
  return product.options
    .map((option) => option.name)
    .sort(
      (a, b) => (positionByName.get(a) ?? 0) - (positionByName.get(b) ?? 0),
    );
}

function valuesOf(variant: ProductDetailVariant): Selection {
  const values: Selection = {};
  for (const link of variant.optionValues) {
    values[link.optionValue.option.name] = link.optionValue.value;
  }
  return values;
}

export function findVariant(
  product: ProductDetail,
  selection: Selection,
): ProductDetailVariant | null {
  const names = optionNamesInOrder(product);
  if (names.some((name) => !selection[name])) return null;

  return (
    product.variants.find((variant) => {
      const values = valuesOf(variant);
      return names.every((name) => values[name] === selection[name]);
    }) ?? null
  );
}

export function isValueAvailable(
  product: ProductDetail,
  selection: Selection,
  optionName: string,
  value: string,
): boolean {
  const others = Object.entries(selection).filter(
    ([name]) => name !== optionName,
  );

  return product.variants.some((variant) => {
    const values = valuesOf(variant);
    if (values[optionName] !== value) return false;
    return others.every(([name, selected]) => values[name] === selected);
  });
}

export function hasStockFor(
  product: ProductDetail,
  selection: Selection,
  optionName: string,
  value: string,
): boolean {
  const others = Object.entries(selection).filter(
    ([name]) => name !== optionName,
  );

  return product.variants.some((variant) => {
    const values = valuesOf(variant);
    if (values[optionName] !== value) return false;
    if (variant.stock <= 0) return false;
    return others.every(([name, selected]) => values[name] === selected);
  });
}

export function imagesForVariant(
  product: ProductDetail,
  variantId: string | null,
) {
  const shared = product.images.filter((image) => image.variantId === null);
  if (!variantId) return shared.length > 0 ? shared : product.images;

  const specific = product.images.filter(
    (image) => image.variantId === variantId,
  );
  return specific.length > 0 ? specific : shared;
}

export const MAX_CART_QUANTITY = 100;

export function maxQuantityFor(variant: ProductDetailVariant | null): number {
  if (!variant) return 0;
  return Math.min(variant.stock, MAX_CART_QUANTITY);
}
