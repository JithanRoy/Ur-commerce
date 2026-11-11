import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  Check,
  Eye,
  FileText,
  FolderTree,
  Image as ImageIcon,
} from "lucide-react";
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
import { SectionCard, SectionDivider } from "@/components/ui/section-card";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import { ErrorState, LoadingState } from "@/components/ui/states";
import {
  EditVariantTable,
  optionSummary,
  type VariantEdit,
} from "@/features/products/edit-variant-table";
import { AddVariantForm } from "@/features/products/add-variant-form";
import { ImageManager } from "@/features/products/image-manager";
import {
  isArchivedIdentifier,
  statusHint,
  withoutArchivedEnding,
} from "@/features/products/archive";
import { TaxonomyFields } from "@/features/products/taxonomy-fields";
import { ProductStatusBadge } from "@/features/products/product-status-badge";

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

function toVariantUpdates(rows: VariantEdit[]) {
  return rows.map((row) => ({
    id: row.id,
    sku: row.sku.trim(),
    price: toPaisa(row.price) ?? 0,
    compareAtPrice: toPaisa(row.compareAtPrice),
    costPrice: toPaisa(row.costPrice),
    stock: Number(row.stock) || 0,
  }));
}

function withRestoredSkus(rows: VariantEdit[]): VariantEdit[] {
  return rows.map((row) => ({ ...row, sku: withoutArchivedEnding(row.sku) }));
}

function rowsChanged(rows: VariantEdit[], product: AdminProduct): boolean {
  const saved = new Map(
    product.variants.map((variant) => [variant.id, toVariantRow(variant)]),
  );
  return rows.some((row) => {
    const original = saved.get(row.id);
    return (
      original !== undefined &&
      (original.sku !== row.sku ||
        original.price !== row.price ||
        original.compareAtPrice !== row.compareAtPrice ||
        original.costPrice !== row.costPrice ||
        original.stock !== row.stock)
    );
  });
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
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
      if (updated.status === "ARCHIVED") setRows(toRow(updated));
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

  const restoring =
    serverProduct?.status === "ARCHIVED" && status !== "ARCHIVED";

  const detailsDirty =
    serverProduct !== undefined &&
    (name !== serverProduct.name ||
      slug !== serverProduct.slug ||
      description !== (serverProduct.description ?? "") ||
      status !== serverProduct.status ||
      categoryId !== (serverProduct.categoryId ?? "") ||
      brandId !== (serverProduct.brandId ?? ""));

  const variantsDirty =
    serverProduct !== undefined && rowsChanged(rows, serverProduct);

  const saving = saveDetails.isPending || saveVariants.isPending;

  const saveDetailsNow = (after?: () => void) =>
    saveDetails.mutate(
      {
        name: name.trim(),
        slug: restoring ? withoutArchivedEnding(slug.trim()) : slug.trim(),
        description: description.trim(),
        status,
        categoryId: categoryId || null,
        brandId: brandId || null,
      },
      { onSuccess: () => after?.() },
    );

  const saveVariantsNow = (source: VariantEdit[], after?: () => void) =>
    saveVariants.mutate(toVariantUpdates(source), {
      onSuccess: () => after?.(),
    });

  const saveChanges = () => {
    if (restoring) {
      const restoredRows = withRestoredSkus(rows);
      const skusArchived = rows.some((row) => isArchivedIdentifier(row.sku));
      saveDetailsNow(() => {
        if (!skusArchived && !variantsDirty) return;
        setRows(restoredRows);
        saveVariantsNow(restoredRows);
      });
      return;
    }
    if (variantsDirty) {
      saveVariantsNow(rows, detailsDirty ? () => saveDetailsNow() : undefined);
      return;
    }
    saveDetailsNow();
  };

  const discardChanges = () => {
    if (!serverProduct) return;
    seedDetails(serverProduct);
    setRows(toRow(serverProduct));
    setError(null);
  };

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
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Products
    </Link>
  );

  if (seededFor !== product.id) {
    return (
      <main className="mx-auto max-w-6xl">
        {backLink}
        <h1 className="mt-4 mb-8 text-2xl font-semibold tracking-tight">
          {product.name}
        </h1>
        <LoadingState variant="form" label="Loading product" />
      </main>
    );
  }

  const labels = Object.fromEntries(
    product.variants.map((variant) => [
      variant.id,
      optionSummary(variant, product),
    ]),
  );
  const totalStock = product.variants.reduce(
    (sum, variant) => sum + variant.stock,
    0,
  );
  const dirty = detailsDirty || variantsDirty;

  return (
    <main className="mx-auto max-w-6xl">
      {backLink}

      <header className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">
          {product.name}
        </h1>
        <ProductStatusBadge status={product.status} />
      </header>
      <p className="mt-1 text-sm text-muted-foreground">
        {plural(product.variants.length, "variant")} ·{" "}
        {plural(totalStock, "unit")} in stock
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <SectionCard
            icon={FileText}
            title="Details"
            description="The name and description shoppers read on the product page."
          >
            <div className="space-y-4">
              <TextField
                id="name"
                label="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <TextField
                id="slug"
                label="Slug"
                hint="Part of the product's web address."
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              />
              <TextareaField
                id="description"
                label="Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
              />
            </div>
          </SectionCard>

          <SectionCard
            icon={ImageIcon}
            title="Images"
            description="Drag to reorder. The first image is the one shoppers see first."
          >
            <ImageManager productId={product.id} variants={product.variants} />
          </SectionCard>

          <SectionCard
            icon={Boxes}
            title={`Variants (${rows.length})`}
            description="Prices in taka. Cost price is never shown to shoppers."
            action={variantsDirty ? <UnsavedPill /> : null}
          >
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

            <SectionDivider
              title="Add a variant"
              description="It is saved straight away, separately from the changes above."
            >
              <AddVariantForm
                product={product}
                onAdd={(input) => addVariant.mutate(input)}
                isPending={addVariant.isPending}
              />
            </SectionDivider>
          </SectionCard>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <SectionCard
            icon={Eye}
            title="Status"
            description="Only active products appear in the shop."
          >
            <SelectField
              id="status"
              label="Status"
              hideLabel
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ProductStatus)
              }
              hint={statusHint(product.status, status)}
              options={[
                { value: "DRAFT", label: "Draft — hidden" },
                { value: "ACTIVE", label: "Active — in the shop" },
                { value: "ARCHIVED", label: "Archived" },
              ]}
            />
          </SectionCard>

          <SectionCard
            icon={FolderTree}
            title="Organisation"
            description="Where shoppers find it."
          >
            <TaxonomyFields
              categoryId={categoryId}
              brandId={brandId}
              onCategoryChange={setCategoryId}
              onBrandChange={setBrandId}
              disabled={saveDetails.isPending}
              className="grid gap-4"
            />
          </SectionCard>
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 mt-6 -mx-1 flex flex-wrap items-center gap-3 rounded-xl border bg-card/95 p-4 shadow-lg backdrop-blur-sm">
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          {dirty ? (
            <>
              <span aria-hidden className="size-2 rounded-full bg-amber-500" />
              Unsaved changes
            </>
          ) : (
            <>
              <Check className="size-4 text-success" aria-hidden />
              All changes saved
            </>
          )}
        </p>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            onClick={discardChanges}
            disabled={!dirty || saving}
            className="px-4"
          >
            Discard
          </Button>
          <Button
            onClick={saveChanges}
            disabled={!dirty}
            loading={saving}
            loadingText="Saving…"
            className="px-5"
          >
            Save changes
          </Button>
        </div>
      </div>
    </main>
  );
}

function UnsavedPill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/12 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      Unsaved
    </span>
  );
}
