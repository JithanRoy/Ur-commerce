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
