import { useRef, useState } from "react";
import {
  AlertCircle,
  GripVertical,
  ImageOff,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import {
  ACCEPTED_IMAGE_TYPES,
  UploadError,
  describeFileRejection,
  isApiError,
} from "@urcommerce/api-client";
import type { AdminVariant } from "@urcommerce/api-client";
import { toast } from "sonner";
import {
  useAttachProductImages,
  usePinProductImage,
  useProductImages,
  useRefreshProductImages,
  useRemoveProductImage,
  useReorderProductImages,
} from "@/api/products";
import { useProductImageUploader } from "@/api/uploads";
import { cn } from "@/lib/utils";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { Button, IconButton } from "@/components/ui/button";

const MAX_IMAGES_PER_BATCH = 20;

type StagedUpload = {
  entryId: string;
  objectKey: string;
  alt: string;
};

type PendingUpload = {
  id: string;
  name: string;
  previewUrl: string;
  status: "uploading" | "failed";
  message?: string;
};

function failureText(error: unknown, fallback: string): string {
  if (error instanceof UploadError) return error.message;
  if (isApiError(error)) return error.message;
  return fallback;
}

function isStorageUnavailable(error: unknown): boolean {
  return isApiError(error) && error.status === 503;
}

function variantLabel(
  variantId: string | null,
  variants: AdminVariant[],
): string {
  if (!variantId) return "All variants";
  const match = variants.find((variant) => variant.id === variantId);
  return match ? match.sku : "Unknown variant";
}

function altFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}

function toAttachInput({ objectKey, alt }: StagedUpload) {
  return { objectKey, alt };
}

function reorderIds(ids: string[], from: number, to: number): string[] {
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return ids;
  next.splice(to, 0, moved);
  return next;
}

export function ImageManager({
  productId,
  variants,
}: {
  productId: string;
  variants: AdminVariant[];
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragDepth, setDragDepth] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const { data: images, isPending } = useProductImages(productId);
  const refresh = useRefreshProductImages(productId);
  const uploadToStorage = useProductImageUploader();
  const attachImages = useAttachProductImages(productId);

  const stageOne = async (
    file: File,
    entryId: string,
  ): Promise<StagedUpload> => {
    const objectKey = await uploadToStorage(file);
    return {
      entryId,
      objectKey,
      alt: altFromFileName(file.name),
    };
  };

  const attachStaged = (staged: StagedUpload[]) =>
    attachImages(staged.map(toAttachInput));

  const settleEntries = (entryIds: string[]) => {
    setPending((current) => {
      for (const entry of current) {
        if (entryIds.includes(entry.id)) URL.revokeObjectURL(entry.previewUrl);
      }
      return current.filter((entry) => !entryIds.includes(entry.id));
    });
  };

  const failEntries = (entryIds: string[], message: string) => {
    setPending((current) =>
      current.map((item) =>
        entryIds.includes(item.id)
          ? { ...item, status: "failed", message }
          : item,
      ),
    );
  };

  const acceptFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);

    const rejected: string[] = [];
    const accepted: { file: File; entry: PendingUpload }[] = [];

    for (const file of files) {
      const rejection = describeFileRejection(file);
      if (rejection) {
        rejected.push(`${file.name}: ${rejection}`);
        continue;
      }
      accepted.push({
        file,
        entry: {
          id: crypto.randomUUID(),
          name: file.name,
          previewUrl: URL.createObjectURL(file),
          status: "uploading",
        },
      });
    }

    if (rejected.length > 0) setError(rejected.join(" · "));
    if (accepted.length === 0) return;

    setPending((current) => [...current, ...accepted.map((item) => item.entry)]);

    const results = await Promise.allSettled(
      accepted.map(({ file, entry }) => stageOne(file, entry.id)),
    );

    if (
      results.some(
        (result) =>
          result.status === "rejected" && isStorageUnavailable(result.reason),
      )
    ) {
      setUnavailable(true);
      setPending([]);
      return;
    }

    const staged: StagedUpload[] = [];
    results.forEach((result, index) => {
      const entryId = accepted[index]?.entry.id;
      if (!entryId) return;
      if (result.status === "fulfilled") staged.push(result.value);
      else failEntries([entryId], failureText(result.reason, "Upload failed."));
    });

    let uploadedCount = 0;
    for (const batch of chunk(staged, MAX_IMAGES_PER_BATCH)) {
      const entryIds = batch.map((item) => item.entryId);
      try {
        await attachStaged(batch);
        settleEntries(entryIds);
        uploadedCount += batch.length;
      } catch (cause) {
        failEntries(
          entryIds,
          failureText(cause, "Could not attach this image."),
        );
      }
    }

    if (uploadedCount > 0) {
      toast.success(
        uploadedCount === 1
          ? "Image uploaded."
          : `${uploadedCount} images uploaded.`,
      );
    }
    await refresh();
  };

  const reorder = useReorderProductImages(productId, {
    success: "Gallery order saved.",
    onError: (cause) =>
      setError(failureText(cause, "Could not reorder the gallery.")),
  });

  const pinVariant = usePinProductImage(productId, {
    success: "Image variant updated.",
    onError: (cause) =>
      setError(failureText(cause, "Could not update that image.")),
  });

  const remove = useRemoveProductImage(productId, {
    success: "Image removed.",
    onError: (cause) =>
      setError(failureText(cause, "Could not remove that image.")),
  });

  const ordered = images ?? [];
  const busy = reorder.isPending || remove.isPending || pinVariant.isPending;
  const uploading = pending.some((entry) => entry.status === "uploading");

  const onDropImage = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const ids = ordered.map((image) => image.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    reorder.mutate(reorderIds(ids, from, to));
  };

  if (unavailable) {
    return (
      <div>
        <h2 className="font-medium">Images</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Image upload is not configured on this server yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">Images</h2>
        {ordered.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Drag to reorder · the first image is the one shoppers see first
          </p>
        ) : null}
      </div>

      <div
        onDragEnter={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          setDragDepth((depth) => depth + 1);
        }}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) event.preventDefault();
        }}
        onDragLeave={() => setDragDepth((depth) => Math.max(0, depth - 1))}
        onDrop={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragDepth(0);
          void acceptFiles(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          "mt-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          dragDepth > 0
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground/25",
        )}
      >
        <ImagePlus
          className={cn(
            "mx-auto size-7",
            dragDepth > 0 ? "text-primary" : "text-muted-foreground/50",
          )}
          aria-hidden
        />
        <p className="mt-2 text-sm font-medium">
          {dragDepth > 0 ? "Drop to upload" : "Drag images here"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          or{" "}
          <Button
            variant="link"
            size="xs"
            onClick={() => fileInput.current?.click()}
            className="align-baseline underline underline-offset-2"
          >
            browse your files
          </Button>{" "}
          · JPEG, PNG, WebP or AVIF up to 10 MB · select several at once
        </p>
      </div>

      <input
        ref={fileInput}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          void acceptFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      {error ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      {isPending ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading images…</p>
      ) : null}

      {!isPending && ordered.length === 0 && pending.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
          <ImageOff className="size-4 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Products without an image look unfinished in the storefront.
          </p>
        </div>
      ) : null}

      {ordered.length > 0 || pending.length > 0 ? (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((image, index) => (
            <li
              key={image.id}
              draggable={!busy}
              onDragStart={() => setDraggingId(image.id)}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTargetId(null);
              }}
              onDragOver={(event) => {
                if (!draggingId) return;
                event.preventDefault();
                setDropTargetId(image.id);
              }}
              onDragLeave={() =>
                setDropTargetId((current) =>
                  current === image.id ? null : current,
                )
              }
              onDrop={(event) => {
                if (!draggingId) return;
                event.preventDefault();
                setDropTargetId(null);
                onDropImage(image.id);
              }}
              className={cn(
                "group overflow-hidden rounded-xl border bg-card transition-all",
                draggingId === image.id && "opacity-40",
                dropTargetId === image.id &&
                  draggingId !== image.id &&
                  "ring-2 ring-primary ring-offset-2",
                !busy && "cursor-grab active:cursor-grabbing",
              )}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={image.url}
                  alt={image.alt ?? ""}
                  className="size-full object-cover"
                  loading="lazy"
                />

                <span
                  aria-hidden
                  className="absolute left-2 top-2 inline-flex size-7 items-center justify-center rounded-md bg-background/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                >
                  <GripVertical className="size-4" />
                </span>

                {index === 0 ? (
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                    <Star className="size-3 fill-current" aria-hidden />
                    Primary
                  </span>
                ) : null}

                <IconButton
                  label="Remove image"
                  title={`Remove image ${index + 1}`}
                  size="icon-sm"
                  onClick={() => remove.mutate(image.id)}
                  disabled={busy}
                  className="absolute bottom-2 right-2 bg-background/90 text-muted-foreground opacity-0 backdrop-blur-sm hover:bg-background/90 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-30"
                >
                  <Trash2 aria-hidden />
                </IconButton>
              </div>

              <div className="border-t p-2.5">
                <Field
                  label={
                    <span className="text-xs text-muted-foreground">
                      Shown for
                    </span>
                  }
                  className="space-y-1"
                >
                  <Select
                    searchable
                    searchPlaceholder="Search SKU…"
                    value={image.variantId ?? ""}
                    disabled={busy}
                    onChange={(event) =>
                      pinVariant.mutate({
                        imageId: image.id,
                        variantId: event.target.value || null,
                      })
                    }
                    placeholder="All variants"
                    options={variants.map((variant) => ({
                      value: variant.id,
                      label: variant.sku,
                    }))}
                    className="h-9 pl-2"
                  />
                </Field>
                <p className="sr-only">
                  {variantLabel(image.variantId, variants)}
                </p>
              </div>
            </li>
          ))}

          {pending.map((entry) => (
            <li
              key={entry.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-card",
                entry.status === "failed" && "border-destructive/40",
              )}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={entry.previewUrl}
                  alt=""
                  className={cn(
                    "size-full object-cover",
                    entry.status === "uploading" && "opacity-50",
                  )}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/40 backdrop-blur-[1px]">
                  {entry.status === "uploading" ? (
                    <>
                      <Loader2
                        className="size-5 animate-spin text-foreground"
                        aria-hidden
                      />
                      <span className="text-xs font-medium">Uploading…</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle
                        className="size-5 text-destructive"
                        aria-hidden
                      />
                      <span className="px-3 text-center text-xs font-medium text-destructive">
                        {entry.message}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 border-t p-2.5">
                <p className="truncate text-xs text-muted-foreground">
                  {entry.name}
                </p>
                {entry.status === "failed" ? (
                  <IconButton
                    label={`Dismiss ${entry.name}`}
                    size="icon-xs"
                    onClick={() => {
                      URL.revokeObjectURL(entry.previewUrl);
                      setPending((current) =>
                        current.filter((item) => item.id !== entry.id),
                      );
                    }}
                    className="ml-auto text-muted-foreground"
                  >
                    <Trash2 aria-hidden />
                  </IconButton>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {uploading ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Uploading {pending.filter((e) => e.status === "uploading").length} of{" "}
          {pending.length}…
        </p>
      ) : null}
    </div>
  );
}
