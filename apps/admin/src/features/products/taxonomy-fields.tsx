import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { isApiError } from "@urcommerce/api-client";
import type { AdminBrand, AdminCategoryNode } from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Button, IconButton } from "@/components/ui/button";
import { slugify } from "./variant-matrix";

type CategoryOption = { id: string; label: string };

const CREATE_NEW = "__create__";

function flattenCategories(
  nodes: AdminCategoryNode[],
  depth = 0,
): CategoryOption[] {
  return [...nodes]
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
    .flatMap((node) => [
      { id: node.id, label: `${"— ".repeat(depth)}${node.name}` },
      ...flattenCategories(node.children ?? [], depth + 1),
    ]);
}

export function useTaxonomy() {
  const categories = useQuery({
    queryKey: ["admin", "categories", "tree"],
    queryFn: () => adminApi.categories.tree(),
    staleTime: 60_000,
  });

  const brands = useQuery({
    queryKey: ["admin", "brands", "all"],
    queryFn: () => adminApi.brands.list({ limit: 100 }),
    staleTime: 60_000,
  });

  return {
    categoryOptions: flattenCategories(categories.data ?? []),
    brandOptions: (brands.data?.items ?? []) as AdminBrand[],
    isPending: categories.isPending || brands.isPending,
  };
}

function TaxonomyPicker({
  label,
  hint,
  emptyLabel,
  value,
  options,
  onChange,
  onCreate,
  disabled,
}: {
  label: string;
  hint: string;
  emptyLabel: string;
  value: string;
  options: CategoryOption[];
  onChange: (value: string) => void;
  onCreate: (name: string) => Promise<{ id: string }>;
  disabled?: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: onCreate,
    onSuccess: (created) => {
      onChange(created.id);
      setCreating(false);
      toast.success(`${label} created and selected.`);
      setName("");
      setError(null);
    },
    onError: (cause) =>
      setError(
        isApiError(cause)
          ? cause.message
          : `Could not create the ${label.toLowerCase()}.`,
      ),
  });

  const submitNew = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate(trimmed);
  };

  return (
    <Field
      label={label}
      hint={hint}
      error={error ? <span role="alert">{error}</span> : undefined}
    >
      {creating ? (
        <div className="flex gap-2">
          <Input
            value={name}
            autoFocus
            disabled={create.isPending}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitNew();
              }
              if (event.key === "Escape") setCreating(false);
            }}
            placeholder={`New ${label.toLowerCase()} name`}
            aria-label={`New ${label.toLowerCase()} name`}
          />
          <Button
            onClick={submitNew}
            disabled={name.trim() === ""}
            loading={create.isPending}
            aria-label={`Create ${label.toLowerCase()}`}
            leading={<Check aria-hidden />}
            className="gap-1.5 px-3"
          >
            Create
          </Button>
          <IconButton
            label="Cancel"
            variant="outline"
            onClick={() => {
              setCreating(false);
              setError(null);
            }}
            className="text-muted-foreground"
          >
            <X aria-hidden />
          </IconButton>
        </div>
      ) : (
        <Select
          value={value}
          disabled={disabled}
          onChange={(event) => {
            if (event.target.value === CREATE_NEW) {
              setCreating(true);
              return;
            }
            onChange(event.target.value);
          }}
          placeholder={emptyLabel}
          options={[
            ...options.map((option) => ({
              value: option.id,
              label: option.label,
            })),
            {
              value: CREATE_NEW,
              label: `＋ Create new ${label.toLowerCase()}…`,
            },
          ]}
        />
      )}
    </Field>
  );
}

export function TaxonomyFields({
  categoryId,
  brandId,
  onCategoryChange,
  onBrandChange,
  disabled,
}: {
  categoryId: string;
  brandId: string;
  onCategoryChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const { categoryOptions, brandOptions, isPending } = useTaxonomy();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TaxonomyPicker
        label="Category"
        hint="Shoppers browse by category, so an uncategorised product is harder to find."
        emptyLabel="Uncategorised"
        value={categoryId}
        options={categoryOptions}
        onChange={onCategoryChange}
        disabled={disabled || isPending}
        onCreate={async (name) => {
          const created = await adminApi.categories.create({
            name,
            slug: slugify(name),
          });
          await queryClient.invalidateQueries({
            queryKey: ["admin", "categories"],
          });
          return created;
        }}
      />

      <TaxonomyPicker
        label="Brand"
        hint="Optional. Used for the brand pages and filters."
        emptyLabel="No brand"
        value={brandId}
        options={brandOptions.map((brand) => ({
          id: brand.id,
          label: brand.name,
        }))}
        onChange={onBrandChange}
        disabled={disabled || isPending}
        onCreate={async (name) => {
          const created = await adminApi.brands.create({
            name,
            slug: slugify(name),
          });
          await queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
          return created;
        }}
      />
    </div>
  );
}
