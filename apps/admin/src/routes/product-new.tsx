import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { isApiError, takaToPaisa } from "@urcommerce/api-client";
import type { CreateProductInput, ProductStatus } from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { OptionsEditor } from "@/features/products/options-editor";
import { VariantTable } from "@/features/products/variant-table";
import { TaxonomyFields } from "@/features/products/taxonomy-fields";
import {
  reconcileVariants,
  slugify,
  usableOptions,
  type OptionDraft,
  type VariantDraft,
} from "@/features/products/variant-matrix";

const singleVariant: VariantDraft = {
  key: "",
  optionValues: [],
  sku: "",
  price: "",
  compareAtPrice: "",
  costPrice: "",
  stock: "0",
};

function toPaisaOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;
  return takaToPaisa(parsed);
}

export function ProductNewRoute() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProductStatus>("DRAFT");
  const [imageUrl, setImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([singleVariant]);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  useEffect(() => {
    setVariants((current) => reconcileVariants(options, current));
  }, [options]);

  const optionNames = useMemo(
    () => usableOptions(options).map((option) => option.name),
    [options],
  );

  const mutation = useMutation({
    mutationFn: (input: CreateProductInput) => adminApi.products.create(input),
    onSuccess: () => navigate("/products"),
    onError: (error) => {
      if (isApiError(error)) {
        setFormError(error.message);
        setFieldErrors(error.errors ?? []);
        return;
      }
      setFormError("Could not save the product.");
    },
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors([]);

    const usable = usableOptions(options);
    const payload: CreateProductInput = {
      name: name.trim(),
      slug: slug.trim(),
      status,
      variants: variants.map((variant) => ({
        sku: variant.sku.trim(),
        price: toPaisaOrUndefined(variant.price) ?? 0,
        compareAtPrice: toPaisaOrUndefined(variant.compareAtPrice),
        costPrice: toPaisaOrUndefined(variant.costPrice),
        stock: Number(variant.stock) || 0,
        ...(usable.length > 0 ? { optionValues: variant.optionValues } : {}),
      })),
    };

    if (description.trim()) payload.description = description.trim();
    if (categoryId) payload.categoryId = categoryId;
    if (brandId) payload.brandId = brandId;
    if (usable.length > 0) payload.options = usable;
    if (imageUrl.trim()) payload.images = [{ url: imageUrl.trim() }];

    mutation.mutate(payload);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        to="/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Products
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">New product</h1>

      <form onSubmit={onSubmit} className="mt-8 space-y-10">
        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="slug" className="text-sm font-medium">
                Slug
              </label>
              <input
                id="slug"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value);
                }}
                required
                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <TaxonomyFields
            categoryId={categoryId}
            brandId={brandId}
            onCategoryChange={setCategoryId}
            onBrandChange={setBrandId}
            disabled={mutation.isPending}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ProductStatus)
                }
                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="image" className="text-sm font-medium">
                Image URL
              </label>
              <input
                id="image"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://…"
                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">Options</h2>
            <p className="text-sm text-muted-foreground">
              Add Size or Colour to generate a variant per combination.
            </p>
          </div>
          <OptionsEditor options={options} onChange={setOptions} />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">
              Variants
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {variants.length}
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Prices in taka. Stored as paisa.
            </p>
          </div>
          <VariantTable
            variants={variants}
            optionNames={optionNames}
            onChange={setVariants}
          />
        </section>

        {formError ? (
          <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">{formError}</p>
            {fieldErrors.length > 1 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {fieldErrors.map((message) => (
                  <li key={message} className="text-sm text-destructive">
                    {message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {mutation.isPending ? "Saving…" : "Create product"}
          </button>
          <Link
            to="/products"
            className="inline-flex h-10 items-center rounded-md border border-input px-5 text-sm"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
