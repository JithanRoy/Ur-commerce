import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ImageOff, Trash2, Upload } from "lucide-react";
import {
  ACCEPTED_IMAGE_TYPES,
  UploadError,
  describeFileRejection,
  isApiError,
  putToStorage,
} from "@urcommerce/api-client";
import type { AdminProductImage, AdminVariant } from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";

function imagesQueryKey(productId: string) {
  return ["admin", "products", productId, "images"];
}

function failureText(error: unknown, fallback: string): string {
  if (error instanceof UploadError) return error.message;
  if (isApiError(error)) return error.message;
  return fallback;
}

function variantLabel(
  variantId: string | null,
  variants: AdminVariant[],
): string {
  if (!variantId) return "All variants";
  const match = variants.find((variant) => variant.id === variantId);
  return match ? match.sku : "Unknown variant";
}

export function ImageManager({
  productId,
  variants,
}: {
  productId: string;
  variants: AdminVariant[];
}) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);

  const { data: images, isPending } = useQuery({
    queryKey: imagesQueryKey(productId),
    queryFn: () => adminApi.products.images.list(productId),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: imagesQueryKey(productId) });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const ticket = await adminApi.uploads.productImageTicket({
        fileName: file.name,
        contentType: file.type,
        contentLength: file.size,
      });
      await putToStorage(ticket, file);
      return adminApi.products.images.attach(productId, {
        objectKey: ticket.objectKey,
        alt: file.name.replace(/\.[^.]+$/, ""),
      });
    },
    onMutate: (file: File) => {
      setError(null);
      setUploadingName(file.name);
    },
    onSuccess: () => refresh(),
    onError: (cause) => {
      const message = failureText(cause, "Could not upload that image.");
      setError(
        isApiError(cause) && cause.status === 503
          ? "Image upload is not configured on this server yet."
          : message,
      );
    },
    onSettled: () => setUploadingName(null),
  });

  const reorder = useMutation({
    mutationFn: (imageIds: string[]) =>
      adminApi.products.images.reorder(productId, imageIds),
    onSuccess: () => refresh(),
    onError: (cause) =>
      setError(failureText(cause, "Could not reorder the gallery.")),
  });

  const pinVariant = useMutation({
    mutationFn: ({
      imageId,
      variantId,
    }: {
      imageId: string;
      variantId: string | null;
    }) => adminApi.products.images.update(productId, imageId, { variantId }),
    onSuccess: () => refresh(),
    onError: (cause) =>
      setError(failureText(cause, "Could not update that image.")),
  });

  const remove = useMutation({
    mutationFn: (imageId: string) =>
      adminApi.products.images.remove(productId, imageId),
    onSuccess: () => refresh(),
    onError: (cause) =>
      setError(failureText(cause, "Could not remove that image.")),
  });

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    const rejection = describeFileRejection(file);
    if (rejection) {
      setError(rejection);
      return;
    }
    upload.mutate(file);
  };

  const ordered = images ?? [];
  const busy =
    upload.isPending ||
    reorder.isPending ||
    remove.isPending ||
    pinVariant.isPending;

  const move = (image: AdminProductImage, delta: number) => {
    const index = ordered.findIndex((entry) => entry.id === image.id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const ids = ordered.map((entry) => entry.id);
    const moved = ids[index];
    const displaced = ids[target];
    if (moved === undefined || displaced === undefined) return;
    ids[index] = displaced;
    ids[target] = moved;
    reorder.mutate(ids);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Images</h2>
          <p className="text-sm text-muted-foreground">
            The first image is the one shoppers see in the grid. JPEG, PNG,
            WebP or AVIF, up to 10 MB.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm font-medium disabled:opacity-50"
        >
          <Upload className="size-4" aria-hidden />
          {upload.isPending ? "Uploading…" : "Upload image"}
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          pickFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {uploadingName ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Uploading {uploadingName}…
        </p>
      ) : null}

      {isPending ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading images…</p>
      ) : ordered.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed px-6 py-12 text-center">
          <ImageOff
            className="mx-auto size-8 text-muted-foreground/40"
            aria-hidden
          />
          <p className="mt-3 text-sm font-medium">No images yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Products without an image look unfinished in the storefront.
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((image, index) => (
            <li key={image.id} className="rounded-lg border p-3">
              <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                <img
                  src={image.url}
                  alt={image.alt ?? ""}
                  className="size-full object-cover"
                  loading="lazy"
                />
                {index === 0 ? (
                  <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium">
                    Primary
                  </span>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  Shown for
                  <select
                    value={image.variantId ?? ""}
                    disabled={busy}
                    onChange={(event) =>
                      pinVariant.mutate({
                        imageId: image.id,
                        variantId: event.target.value || null,
                      })
                    }
                    className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                  >
                    <option value="">All variants</option>
                    {variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.sku}
                      </option>
                    ))}
                  </select>
                </label>

                <p className="truncate text-xs text-muted-foreground">
                  {variantLabel(image.variantId, variants)}
                </p>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(image, -1)}
                    disabled={busy || index === 0}
                    aria-label="Move earlier"
                    className="inline-flex size-8 items-center justify-center rounded-md border border-input disabled:opacity-30"
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(image, 1)}
                    disabled={busy || index === ordered.length - 1}
                    aria-label="Move later"
                    className="inline-flex size-8 items-center justify-center rounded-md border border-input disabled:opacity-30"
                  >
                    <ArrowRight className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(image.id)}
                    disabled={busy}
                    aria-label="Remove image"
                    className="ml-auto inline-flex size-8 items-center justify-center rounded-md border border-input text-destructive disabled:opacity-30"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
