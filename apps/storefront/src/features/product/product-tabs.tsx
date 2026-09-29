"use client";

import { useState } from "react";
import { formatBDT } from "@urcommerce/api-client";
import type { ProductDetail } from "@urcommerce/api-client";
import { optionNamesInOrder } from "./variant-resolution";
import { cn } from "@/lib/utils";

const tabs = ["Description", "Details"] as const;
type Tab = (typeof tabs)[number];

function variantLabel(
  variant: ProductDetail["variants"][number],
  names: string[],
): string {
  if (names.length === 0) return "Standard";
  const byOption = new Map(
    variant.optionValues.map((entry) => [
      entry.optionValue.option.name,
      entry.optionValue.value,
    ]),
  );
  return names.map((name) => byOption.get(name) ?? "—").join(" / ");
}

export function ProductTabs({ product }: { product: ProductDetail }) {
  const [active, setActive] = useState<Tab>("Description");
  const names = optionNamesInOrder(product);

  return (
    <section className="mt-14 border-t pt-8">
      <div
        role="tablist"
        aria-label="Product information"
        className="flex flex-wrap justify-center gap-2"
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active === tab}
            onClick={() => setActive(tab)}
            className={cn(
              "h-10 rounded-full px-5 text-sm font-medium transition-colors",
              active === tab
                ? "border-2 border-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mx-auto mt-8 max-w-3xl">
        {active === "Description" ? (
          product.description ? (
            <p className="whitespace-pre-line text-pretty leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              No description yet.
            </p>
          )
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">
                    {names.length > 0 ? names.join(" / ") : "Variant"}
                  </th>
                  <th className="px-4 py-2.5 font-medium">SKU</th>
                  <th className="px-4 py-2.5 font-medium">Price</th>
                  <th className="px-4 py-2.5 font-medium">Availability</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => (
                  <tr key={variant.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium">
                      {variantLabel(variant, names)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {variant.sku}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatBDT(variant.price)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5",
                        variant.stock > 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {variant.stock > 0 ? "In stock" : "Sold out"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
