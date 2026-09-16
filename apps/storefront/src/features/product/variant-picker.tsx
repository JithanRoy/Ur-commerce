"use client";

import type { ProductDetail } from "@urcommerce/api-client";
import {
  hasStockFor,
  isValueAvailable,
  optionNamesInOrder,
  type Selection,
} from "./variant-resolution";
import { cn } from "@/lib/utils";

type Props = {
  product: ProductDetail;
  selection: Selection;
  onSelect: (optionName: string, value: string) => void;
};

export function VariantPicker({ product, selection, onSelect }: Props) {
  const names = optionNamesInOrder(product);

  return (
    <div className="space-y-6">
      {names.map((name) => {
        const option = product.options.find((entry) => entry.name === name);
        if (!option) return null;

        return (
          <fieldset key={name}>
            <legend className="mb-2.5 text-sm font-medium">
              {name}
              {selection[name] ? (
                <span className="ml-2 font-normal text-muted-foreground">
                  {selection[name]}
                </span>
              ) : null}
            </legend>

            <div className="flex flex-wrap gap-2">
              {option.values.map(({ value }) => {
                const possible = isValueAvailable(
                  product,
                  selection,
                  name,
                  value,
                );
                const inStock = hasStockFor(product, selection, name, value);
                const isSelected = selection[name] === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onSelect(name, value)}
                    disabled={!possible}
                    aria-pressed={isSelected}
                    className={cn(
                      "relative h-10 min-w-12 rounded-md border px-3.5 text-sm transition-colors",
                      isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "hover:border-foreground/40",
                      !possible && "cursor-not-allowed opacity-40",
                      possible &&
                        !inStock &&
                        !isSelected &&
                        "text-muted-foreground",
                    )}
                  >
                    {value}
                    {possible && !inStock ? (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="h-px w-[130%] -rotate-12 bg-current opacity-40" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
