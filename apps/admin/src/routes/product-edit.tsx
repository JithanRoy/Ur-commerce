import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { isApiError, paisaToTakaInput } from "@urcommerce/api-client";
import type {
  AdminProduct,
  AdminVariant,
  ProductStatus,
} from "@urcommerce/api-client";
import { useBackToList } from "@/lib/list-params";
import {
  useAddVariant,
  useProduct,
  useRemoveVariant,
  useUpdateProduct,
  useUpdateVariants,
} from "@/api/products";
import { Button } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import { ErrorState, LoadingState } from "@/components/ui/states";
import {
  EditVariantTable,
  optionSummary,
  type VariantEdit,
} from "@/features/products/edit-variant-table";
import { AddVariantForm } from "@/features/products/add-variant-form";
import { ImageManager } from "@/features/products/image-manager";
import { TaxonomyFields } from "@/features/products/taxonomy-fields";

function toVariantRow(variant: AdminVariant): VariantEdit {
  return {
    id: variant.id,
    sku: variant.sku,
    price: String(paisaToTakaInput(variant.price)),
    compareAtPrice:
      variant.compareAtPrice === null
        ? ""
        : String(paisaToTakaInput(variant.compareAtPrice)),
    costPrice:
      variant.costPrice === null
        ? ""
        : String(paisaToTakaInput(variant.costPrice)),
    stock: String(variant.stock),
  };
}

function toRow(product: AdminProduct): VariantEdit[] {
  return product.variants.map(toVariantRow);
}

function toPaisa(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : undefined;
}

export function ProductEditRoute() {
  const { productId = "" } = useParams<{ productId: string }>();
  const backToList = useBackToList("/products");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProductStatus>("DRAFT");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [rows, setRows] = useState<VariantEdit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  const {
    data: product,
    isPending,
    isPlaceholderData,
    error: loadError,
  } = useProduct(productId);

  const serverProduct = isPlaceholderData ? undefined : product;

  const seedDetails = (source: AdminProduct) => {
    setName(source.name);
    setSlug(source.slug);
    setDescription(source.description ?? "");
    setStatus(source.status);
    setCategoryId(source.categoryId ?? "");
    setBrandId(source.brandId ?? "");
  };

  useEffect(() => {
    if (!serverProduct || seededFor === serverProduct.id) return;
    seedDetails(serverProduct);
    setRows(toRow(serverProduct));
    setError(null);
    setSeededFor(serverProduct.id);
  }, [serverProduct, seededFor]);

  const failed = (fallback: string) => (mutationError: unknown) => {
    setError(isApiError(mutationError) ? mutationError.message : fallback);
  };

  const saveDetails = useUpdateProduct(productId, {
    success: "Details saved.",
    onSuccess: (updated) => {
      setError(null);
      seedDetails(updated);
    },
    onError: failed("Could not save the product."),
  });

  const saveVariants = useUpdateVariants(productId, {
    success: "Variants saved.",
    onSuccess: (updated) => {
      setError(null);
      setRows(toRow(updated));
    },
    onError: failed("Could not save the variants."),
  });

  const addVariant = useAddVariant(productId, {
    success: "Variant added.",
    onSuccess: (variant) => {
      setError(null);
      setRows((current) => [...current, toVariantRow(variant)]);
    },
    onError: failed("Could not add the variant."),
  });

  const removeVariant = useRemoveVariant(productId, {
    success: "Variant removed.",
    onSuccess: (_result, variantId) => {
      setError(null);
      setRows((current) => current.filter((row) => row.id !== variantId));
    },
    onError: failed("Could not remove the variant."),
    onSettled: () => setRemovingId(null),
  });

  const submitDetails = () =>
    saveDetails.mutate({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      status,
      categoryId: categoryId || null,
      brandId: brandId || null,
    });

  const submitVariants = () =>
    saveVariants.mutate(
      rows.map((row) => ({
        id: row.id,
        sku: row.sku.trim(),
        price: toPaisa(row.price) ?? 0,
        compareAtPrice: toPaisa(row.compareAtPrice),
        costPrice: toPaisa(row.costPrice),
        stock: Number(row.stock) || 0,
      })),
    );

  if (isPending) return <LoadingState variant="form" />;
  if (!product) {
    return (
      <ErrorState
        message={
          loadError instanceof Error
            ? loadError.message
            : "Could not load this product."
        }
      />
    );
  }

  const backLink = (
    <Link
      to={backToList}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Products
    </Link>
  );

  if (seededFor !== product.id) {
    return (
      <>
        {backLink}
        <h1 className="mt-4 mb-8 text-xl font-semibold tracking-tight">
          {product.name}
        </h1>
        <LoadingState variant="form" label="Loading product" />
      </>
    );
  }

  const labels = Object.fromEntries(
    product.variants.map((variant) => [
      variant.id,
      optionSummary(variant, product),
    ]),
  );

  return (
    <>
      {backLink}

      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        {product.name}
      </h1>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-4 font-medium">Details</h2>
        <div className="grid max-w-2xl gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="name"
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <TextField
              id="slug"
              label="Slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
            />
          </div>

          <TextareaField
            id="description"
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />

          <TaxonomyFields
            categoryId={categoryId}
            brandId={brandId}
            onCategoryChange={setCategoryId}
            onBrandChange={setBrandId}
            disabled={saveDetails.isPending}
          />

          <SelectField
            id="status"
            label="Status"
            containerClassName="w-48"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ProductStatus)
            }
            options={[
              { value: "DRAFT", label: "Draft" },
              { value: "ACTIVE", label: "Active" },
              { value: "ARCHIVED", label: "Archived" },
            ]}
          />

          <div>
            <Button
              onClick={submitDetails}
              loading={saveDetails.isPending}
              loadingText="Saving…"
              className="px-5"
            >
              Save details
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <ImageManager productId={product.id} variants={product.variants} />
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-medium">Variants</h2>
            <p className="text-sm text-muted-foreground">
              Prices in taka. Stored as paisa.
            </p>
          </div>
          <Button
            onClick={submitVariants}
            disabled={rows.length === 0}
            loading={saveVariants.isPending}
            loadingText="Saving…"
            className="h-9"
          >
            Save variants
          </Button>
        </div>

        <EditVariantTable
          rows={rows}
          labels={labels}
          canRemove={rows.length > 1}
          onChange={setRows}
          onRemove={(variantId) => {
            setRemovingId(variantId);
            removeVariant.mutate(variantId);
          }}
          removingId={removingId}
        />

        {rows.length === 1 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            A product must keep at least one variant. Archive the product
            instead of removing it.
          </p>
        ) : null}

        <div className="mt-6 rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">Add a variant</h3>
          <AddVariantForm
            product={product}
            onAdd={(input) => addVariant.mutate(input)}
            isPending={addVariant.isPending}
          />
        </div>
      </section>
    </>
  );
}
