import { Trash2 } from "lucide-react";
import type { AdminProduct, AdminVariant } from "@urcommerce/api-client";

export type VariantEdit = {
  id: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  stock: string;
};

export function optionSummary(
  variant: AdminVariant,
  product: AdminProduct,
): string {
  const positionByOptionId = new Map(
    product.options.map((option) => [option.id, option.position]),
  );

  return [...variant.optionValues]
    .sort(
      (a, b) =>
        (positionByOptionId.get(a.optionValue.optionId) ?? 0) -
        (positionByOptionId.get(b.optionValue.optionId) ?? 0),
    )
    .map((link) => link.optionValue.value)
    .join(" / ");
}

const field =
  "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm tabular-nums";

type Props = {
  rows: VariantEdit[];
  labels: Record<string, string>;
  canRemove: boolean;
  onChange: (rows: VariantEdit[]) => void;
  onRemove: (variantId: string) => void;
  removingId: string | null;
};

export function EditVariantTable({
  rows,
  labels,
  canRemove,
  onChange,
  onRemove,
  removingId,
}: Props) {
  function update(index: number, patch: Partial<VariantEdit>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2.5 font-medium">Variant</th>
            <th className="px-3 py-2.5 font-medium">SKU</th>
            <th className="px-3 py-2.5 font-medium">Price ৳</th>
            <th className="px-3 py-2.5 font-medium">Compare at ৳</th>
            <th className="px-3 py-2.5 font-medium">Cost ৳</th>
            <th className="px-3 py-2.5 font-medium">Stock</th>
            <th className="w-px px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="whitespace-nowrap px-3 py-2 font-medium">
                {labels[row.id] ?? "—"}
              </td>
              <td className="px-3 py-2">
                <input
                  value={row.sku}
                  onChange={(event) => update(index, { sku: event.target.value })}
                  aria-label={`SKU for ${labels[row.id] ?? row.id}`}
                  className="h-9 w-36 rounded-md border border-input bg-transparent px-2 text-sm"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  inputMode="decimal"
                  value={row.price}
                  onChange={(event) =>
                    update(index, { price: event.target.value })
                  }
                  aria-label={`Price for ${labels[row.id] ?? row.id}`}
                  className={field}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  inputMode="decimal"
                  value={row.compareAtPrice}
                  onChange={(event) =>
                    update(index, { compareAtPrice: event.target.value })
                  }
                  aria-label={`Compare at price for ${labels[row.id] ?? row.id}`}
                  className={field}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  inputMode="decimal"
                  value={row.costPrice}
                  onChange={(event) =>
                    update(index, { costPrice: event.target.value })
                  }
                  aria-label={`Cost price for ${labels[row.id] ?? row.id}`}
                  className={field}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  inputMode="numeric"
                  value={row.stock}
                  onChange={(event) =>
                    update(index, { stock: event.target.value })
                  }
                  aria-label={`Stock for ${labels[row.id] ?? row.id}`}
                  className={field}
                />
              </td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => onRemove(row.id)}
                  disabled={!canRemove || removingId === row.id}
                  title={
                    canRemove
                      ? "Remove this variant"
                      : "A product must keep at least one variant"
                  }
                  aria-label={`Remove ${labels[row.id] ?? row.id}`}
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
