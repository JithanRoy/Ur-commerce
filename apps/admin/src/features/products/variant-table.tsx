import type { VariantDraft } from "./variant-matrix";

type Props = {
  variants: VariantDraft[];
  optionNames: string[];
  onChange: (variants: VariantDraft[]) => void;
};

const numericField = "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm tabular-nums";

export function VariantTable({ variants, optionNames, onChange }: Props) {
  function update(index: number, patch: Partial<VariantDraft>) {
    onChange(
      variants.map((variant, i) =>
        i === index ? { ...variant, ...patch } : variant,
      ),
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left">
          <tr>
            {optionNames.map((name) => (
              <th key={name} className="px-3 py-2.5 font-medium">
                {name}
              </th>
            ))}
            <th className="px-3 py-2.5 font-medium">SKU</th>
            <th className="px-3 py-2.5 font-medium">Price ৳</th>
            <th className="px-3 py-2.5 font-medium">Compare at ৳</th>
            <th className="px-3 py-2.5 font-medium">Cost ৳</th>
            <th className="px-3 py-2.5 font-medium">Stock</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant, index) => (
            <tr key={variant.key || index} className="border-b last:border-0">
              {variant.optionValues.map((value, i) => (
                <td key={i} className="whitespace-nowrap px-3 py-2 font-medium">
                  {value}
                </td>
              ))}
              {optionNames.length === 0 ? (
                <td className="px-3 py-2 text-muted-foreground">Single</td>
              ) : null}
              <td className="px-3 py-2">
                <input
                  value={variant.sku}
                  onChange={(event) => update(index, { sku: event.target.value })}
                  aria-label={`SKU for ${variant.key || "variant"}`}
                  className="h-9 w-36 rounded-md border border-input bg-transparent px-2 text-sm"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  inputMode="decimal"
                  value={variant.price}
                  onChange={(event) =>
                    update(index, { price: event.target.value })
                  }
                  aria-label={`Price for ${variant.key || "variant"}`}
                  className={numericField}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  inputMode="decimal"
                  value={variant.compareAtPrice}
                  onChange={(event) =>
                    update(index, { compareAtPrice: event.target.value })
                  }
                  aria-label={`Compare at price for ${variant.key || "variant"}`}
                  className={numericField}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  inputMode="decimal"
                  value={variant.costPrice}
                  onChange={(event) =>
                    update(index, { costPrice: event.target.value })
                  }
                  aria-label={`Cost price for ${variant.key || "variant"}`}
                  className={numericField}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  inputMode="numeric"
                  value={variant.stock}
                  onChange={(event) =>
                    update(index, { stock: event.target.value })
                  }
                  aria-label={`Stock for ${variant.key || "variant"}`}
                  className={numericField}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
