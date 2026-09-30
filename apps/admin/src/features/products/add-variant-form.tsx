import { useState } from "react";
import { Plus } from "lucide-react";
import type { AdminProduct, CreateVariantInput } from "@urcommerce/api-client";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

function CompactField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Field
      id={id}
      label={<span className="text-xs text-muted-foreground">{label}</span>}
    >
      {children}
    </Field>
  );
}

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
        <CompactField key={option.id} id={`add-${option.id}`} label={option.name}>
          <Select
            value={values[option.name] ?? ""}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [option.name]: event.target.value,
              }))
            }
            placeholder="Choose…"
            options={[...option.values]
              .sort((a, b) => a.position - b.position)
              .map((value) => ({ value: value.value, label: value.value }))}
            className="h-9 pl-2"
          />
        </CompactField>
      ))}

      <CompactField id="add-sku" label="SKU">
        <Input
          value={sku}
          onChange={(event) => setSku(event.target.value)}
          className="h-9 w-36 px-2"
        />
      </CompactField>

      <CompactField id="add-price" label="Price ৳">
        <Input
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="h-9 w-24 px-2 tabular-nums"
        />
      </CompactField>

      <CompactField id="add-stock" label="Stock">
        <Input
          inputMode="numeric"
          value={stock}
          onChange={(event) => setStock(event.target.value)}
          className="h-9 w-20 px-2 tabular-nums"
        />
      </CompactField>

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
