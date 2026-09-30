import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { isApiError, paisaToTakaInput } from "@urcommerce/api-client";
import type {
  AdminProduct,
  CreateVariantInput,
  ProductStatus,
} from "@urcommerce/api-client";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
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

function toRow(product: AdminProduct): VariantEdit[] {
  return product.variants.map((variant) => ({
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
  }));
}

function toPaisa(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : undefined;
}

export function ProductEditRoute() {
  const { productId } = useParams<{ productId: string }>();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProductStatus>("DRAFT");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [rows, setRows] = useState<VariantEdit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data: product, isPending, error: loadError } = useQuery({
    queryKey: ["admin", "products", productId],
    queryFn: () => adminApi.products.get(productId as string),
    enabled: Boolean(productId),
  });

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setSlug(product.slug);
    setDescription(product.description ?? "");
    setStatus(product.status);
    setCategoryId(product.categoryId ?? "");
    setBrandId(product.brandId ?? "");
    setRows(toRow(product));
  }, [product]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
  };

  const failed = (fallback: string) => (mutationError: unknown) => {
    setError(isApiError(mutationError) ? mutationError.message : fallback);
  };

  const saveDetails = useMutation({
    mutationFn: () =>
      adminApi.products.update(productId as string, {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        status,
        categoryId: categoryId || null,
        brandId: brandId || null,
      }),
    onSuccess: () => {
      setError(null);
      toast.success("Details saved.");
      invalidate();
    },
    onError: failed("Could not save the product."),
  });

  const saveVariants = useMutation({
    mutationFn: () =>
      adminApi.products.updateVariants(
        productId as string,
        rows.map((row) => ({
          id: row.id,
          sku: row.sku.trim(),
          price: toPaisa(row.price) ?? 0,
          compareAtPrice: toPaisa(row.compareAtPrice),
          costPrice: toPaisa(row.costPrice),
          stock: Number(row.stock) || 0,
        })),
      ),
    onSuccess: () => {
      setError(null);
      toast.success("Variants saved.");
      invalidate();
    },
    onError: failed("Could not save the variants."),
  });

  const addVariant = useMutation({
    mutationFn: (input: CreateVariantInput) =>
      adminApi.products.addVariant(productId as string, input),
    onSuccess: () => {
      setError(null);
      toast.success("Variant added.");
      invalidate();
    },
    onError: failed("Could not add the variant."),
  });

  const removeVariant = useMutation({
    mutationFn: (variantId: string) =>
      adminApi.products.removeVariant(productId as string, variantId),
    onSuccess: () => {
      setError(null);
      toast.success("Variant removed.");
      invalidate();
    },
    onError: failed("Could not remove the variant."),
    onSettled: () => setRemovingId(null),
  });

  if (isPending) return <LoadingState />;
  if (loadError || !product) {
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

  const labels = Object.fromEntries(
    product.variants.map((variant) => [
      variant.id,
      optionSummary(variant, product),
    ]),
  );

  return (
    <>
      <Link
        to="/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Products
      </Link>

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
              onClick={() => saveDetails.mutate()}
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
            onClick={() => saveVariants.mutate()}
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
