import { useState } from "react";
import { Plus } from "lucide-react";
import type { AdminProduct, CreateVariantInput } from "@urcommerce/api-client";

type Props = {
  product: AdminProduct;
  onAdd: (input: CreateVariantInput) => void;
  isPending: boolean;
};

export function AddVariantForm({ product, onAdd, isPending }: Props) {
  const options = [...product.options].sort(
    (a, b) => a.position - b.position,
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");

  const complete =
    sku.trim() !== "" &&
    price.trim() !== "" &&
    options.every((option) => values[option.name]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!complete) return;
    onAdd({
      sku: sku.trim(),
      price: Math.round(Number(price) * 100),
      stock: Number(stock) || 0,
      ...(options.length > 0
        ? {
            optionValues: options.map(
              (option) => values[option.name] as string,
            ),
          }
        : {}),
    });
    setSku("");
    setPrice("");
    setStock("0");
    setValues({});
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      {options.map((option) => (
        <div key={option.id} className="space-y-1.5">
          <label
            htmlFor={`add-${option.id}`}
            className="block text-xs font-medium text-muted-foreground"
          >
            {option.name}
          </label>
          <select
            id={`add-${option.id}`}
            value={values[option.name] ?? ""}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [option.name]: event.target.value,
              }))
            }
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Choose…</option>
            {[...option.values]
              .sort((a, b) => a.position - b.position)
              .map((value) => (
                <option key={value.id} value={value.value}>
                  {value.value}
                </option>
              ))}
          </select>
        </div>
      ))}

      <div className="space-y-1.5">
        <label
          htmlFor="add-sku"
          className="block text-xs font-medium text-muted-foreground"
        >
          SKU
        </label>
        <input
          id="add-sku"
          value={sku}
          onChange={(event) => setSku(event.target.value)}
          className="h-9 w-36 rounded-md border border-input bg-transparent px-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="add-price"
          className="block text-xs font-medium text-muted-foreground"
        >
          Price ৳
        </label>
        <input
          id="add-price"
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="h-9 w-24 rounded-md border border-input bg-transparent px-2 text-sm tabular-nums"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="add-stock"
          className="block text-xs font-medium text-muted-foreground"
        >
          Stock
        </label>
        <input
          id="add-stock"
          inputMode="numeric"
          value={stock}
          onChange={(event) => setStock(event.target.value)}
          className="h-9 w-20 rounded-md border border-input bg-transparent px-2 text-sm tabular-nums"
        />
      </div>

      <button
        type="submit"
        disabled={!complete || isPending}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm disabled:opacity-40"
      >
        <Plus className="size-4" />
        {isPending ? "Adding…" : "Add variant"}
      </button>
    </form>
  );
}
