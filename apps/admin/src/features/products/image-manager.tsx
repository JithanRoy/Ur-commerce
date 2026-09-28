import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  putToStorage,
} from "@urcommerce/api-client";
import type { AdminVariant } from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { cn } from "@/lib/utils";

type PendingUpload = {
  id: string;
  name: string;
  previewUrl: string;
  status: "uploading" | "failed";
  message?: string;
};

function imagesQueryKey(productId: string) {
  return ["admin", "products", productId, "images"];
}

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
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragDepth, setDragDepth] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const { data: images, isPending } = useQuery({
    queryKey: imagesQueryKey(productId),
    queryFn: () => adminApi.products.images.list(productId),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: imagesQueryKey(productId) });

  const uploadOne = async (file: File, entryId: string) => {
    const ticket = await adminApi.uploads.productImageTicket({
      fileName: file.name,
      contentType: file.type,
      contentLength: file.size,
    });
    await putToStorage(ticket, file);
    await adminApi.products.images.attach(productId, {
      objectKey: ticket.objectKey,
      alt: altFromFileName(file.name),
    });
    setPending((current) => {
      const done = current.find((entry) => entry.id === entryId);
      if (done) URL.revokeObjectURL(done.previewUrl);
      return current.filter((entry) => entry.id !== entryId);
    });
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

    for (const { file, entry } of accepted) {
      try {
        await uploadOne(file, entry.id);
      } catch (cause) {
        if (isStorageUnavailable(cause)) {
          setUnavailable(true);
          setPending([]);
          return;
        }
        setPending((current) =>
          current.map((item) =>
            item.id === entry.id
              ? {
                  ...item,
                  status: "failed",
                  message: failureText(cause, "Upload failed."),
                }
              : item,
          ),
        );
      }
    }

    await refresh();
  };

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
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="font-medium text-primary underline underline-offset-2"
          >
            browse your files
          </button>{" "}
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

                <button
                  type="button"
                  onClick={() => remove.mutate(image.id)}
                  disabled={busy}
                  aria-label="Remove image"
                  title={`Remove image ${index + 1}`}
                  className="absolute bottom-2 right-2 inline-flex size-8 items-center justify-center rounded-md bg-background/90 text-muted-foreground opacity-0 backdrop-blur-sm transition-all hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-30"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>

              <div className="border-t p-2.5">
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
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(entry.previewUrl);
                      setPending((current) =>
                        current.filter((item) => item.id !== entry.id),
                      );
                    }}
                    aria-label={`Dismiss ${entry.name}`}
                    className="ml-auto inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
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
