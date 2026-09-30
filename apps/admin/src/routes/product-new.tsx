import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Boxes, Image as ImageIcon, Layers } from "lucide-react";
import { isApiError, takaToPaisa } from "@urcommerce/api-client";
import type { CreateProductInput, ProductStatus } from "@urcommerce/api-client";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import { ImageDropzone, type UploadedImage } from "@/components/ui/image-dropzone";
import { OptionsEditor } from "@/features/products/options-editor";
import { VariantTable } from "@/features/products/variant-table";
import { TaxonomyFields } from "@/features/products/taxonomy-fields";
import {
  autoSku,
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

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Boxes;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-xs sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4.5" aria-hidden />
        </span>
        <div>
          <h2 className="font-medium leading-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function ProductNewRoute() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProductStatus>("DRAFT");
  const [images, setImages] = useState<UploadedImage[]>([]);
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
    onSuccess: (created) => {
      toast.success(`${created.name} created.`);
      navigate("/products");
    },
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
        sku: variant.sku.trim() || autoSku(name, variant.optionValues),
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
    if (images.length > 0) {
      payload.images = images.map((image) => ({
        objectKey: image.objectKey,
        alt: image.fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
      }));
    }

    mutation.mutate(payload);
  }

  return (
    <main className="mx-auto max-w-5xl">
      <Link
        to="/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Products
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New product</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drafts stay hidden from the storefront until you set them active.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <FormSection
          icon={Boxes}
          title="Basics"
          description="Name, description and where the product lives in your catalogue."
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="name"
                label="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="Classic Cotton Panjabi"
              />
              <TextField
                id="slug"
                label="Slug"
                hint="Fills in from the name. Part of the product URL."
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value);
                }}
                required
              />
            </div>

            <TextareaField
              id="description"
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="What makes it worth buying?"
            />

            <TaxonomyFields
              categoryId={categoryId}
              brandId={brandId}
              onCategoryChange={setCategoryId}
              onBrandChange={setBrandId}
              disabled={mutation.isPending}
            />

            <SelectField
              id="status"
              label="Status"
              fieldClassName="max-w-xs"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ProductStatus)
              }
              options={[
                { value: "DRAFT", label: "Draft — hidden from shoppers" },
                { value: "ACTIVE", label: "Active — visible in the shop" },
              ]}
            />
          </div>
        </FormSection>

        <FormSection
          icon={ImageIcon}
          title="Images"
          description="Drag files in or browse. The first image is what shoppers see in the grid."
        >
          <ImageDropzone
            scope="product"
            images={images}
            onChange={setImages}
            disabled={mutation.isPending}
          />
        </FormSection>

        <FormSection
          icon={Layers}
          title="Options"
          description="Add Size or Colour to generate a variant per combination."
        >
          <OptionsEditor options={options} onChange={setOptions} />
        </FormSection>

        <FormSection
          icon={Boxes}
          title={`Variants (${variants.length})`}
          description="Prices in taka, stored as paisa. SKUs fill in automatically — edit any you want to override."
        >
          <VariantTable
            variants={variants}
            optionNames={optionNames}
            onChange={setVariants}
            productName={name}
          />
        </FormSection>

        {formError ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/5 p-4"
          >
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

        <div className="sticky bottom-0 -mx-1 flex items-center gap-3 rounded-xl border bg-card/95 p-4 shadow-lg backdrop-blur-sm">
          <Button
            type="submit"
            loading={mutation.isPending}
            loadingText="Saving…"
            className="px-5"
          >
            Create product
          </Button>
          <Button asChild variant="outline" className="px-5">
            <Link to="/products">Cancel</Link>
          </Button>
          <p className="ml-auto hidden text-xs text-muted-foreground sm:block">
            {images.length > 0
              ? `${images.length} image${images.length === 1 ? "" : "s"} ready`
              : "No images yet"}
          </p>
        </div>
      </form>
    </main>
  );
}
