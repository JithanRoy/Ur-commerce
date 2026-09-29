export type OptionDraft = {
  name: string;
  values: string[];
};

export type VariantDraft = {
  key: string;
  optionValues: string[];
  sku: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  stock: string;
};

function cartesian(lists: string[][]): string[][] {
  return lists.reduce<string[][]>(
    (acc, list) => acc.flatMap((combo) => list.map((value) => [...combo, value])),
    [[]],
  );
}

export function combinationKey(optionValues: string[]): string {
  return optionValues.join(" / ");
}

export function usableOptions(options: OptionDraft[]): OptionDraft[] {
  return options
    .map((option) => ({
      name: option.name.trim(),
      values: option.values.map((value) => value.trim()).filter(Boolean),
    }))
    .filter((option) => option.name !== "" && option.values.length > 0);
}

export function buildCombinations(options: OptionDraft[]): string[][] {
  const usable = usableOptions(options);
  if (usable.length === 0) return [];
  return cartesian(usable.map((option) => option.values));
}

export function reconcileVariants(
  options: OptionDraft[],
  existing: VariantDraft[],
): VariantDraft[] {
  const combinations = buildCombinations(options);
  if (combinations.length === 0) return existing.slice(0, 1);

  const byKey = new Map(existing.map((variant) => [variant.key, variant]));

  return combinations.map((optionValues) => {
    const key = combinationKey(optionValues);
    const previous = byKey.get(key);
    if (previous) return { ...previous, optionValues };
    return {
      key,
      optionValues,
      sku: "",
      price: "",
      compareAtPrice: "",
      costPrice: "",
      stock: "0",
    };
  });
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function skuToken(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return /^\d+$/.test(cleaned) ? cleaned : cleaned.slice(0, 3);
}

function skuPrefix(productName: string): string {
  const words = productName.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const initials = words
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 4);
  if (initials.length >= 2) return initials;
  const first = words[0] ?? "";
  return first.toUpperCase().slice(0, 3) || "SKU";
}

export function autoSku(productName: string, optionValues: string[]): string {
  const prefix = skuPrefix(productName);
  if (optionValues.length === 0) return `${prefix}-STD`;
  return [prefix, ...optionValues.map(skuToken)].join("-");
}
