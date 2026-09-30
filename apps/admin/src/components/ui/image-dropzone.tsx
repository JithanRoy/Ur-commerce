import { useRef, useState } from "react";
import { AlertCircle, ImagePlus, Loader2, X } from "lucide-react";
import {
  ACCEPTED_IMAGE_TYPES,
  UploadError,
  describeFileRejection,
  isApiError,
  putToStorage,
} from "@urcommerce/api-client";
import type { UploadScope } from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/button";

export type UploadedImage = {
  objectKey: string;
  previewUrl: string;
  fileName: string;
};

type PendingFile = {
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

export function ImageDropzone({
  scope,
  images,
  onChange,
  maxImages = 8,
  disabled,
}: {
  scope: UploadScope;
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);

  const uploadOne = async (file: File, entryId: string) => {
    const ticket = await adminApi.uploads.imageTicket({
      scope,
      fileName: file.name,
      contentType: file.type,
      contentLength: file.size,
    });
    await putToStorage(ticket, file);
    setPending((current) => current.filter((entry) => entry.id !== entryId));
    return {
      objectKey: ticket.objectKey,
      fileName: file.name,
    };
  };

  const acceptFiles = async (files: File[]) => {
    if (disabled || files.length === 0) return;
    setError(null);

    const room = maxImages - images.length - pending.length;
    if (files.length > room) {
      setError(`Up to ${maxImages} images. ${Math.max(room, 0)} more can be added.`);
      files = files.slice(0, Math.max(room, 0));
    }

    const rejected: string[] = [];
    const accepted: { file: File; entry: PendingFile }[] = [];

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

    const done: UploadedImage[] = [];
    for (const { file, entry } of accepted) {
      try {
        const uploaded = await uploadOne(file, entry.id);
        done.push({ ...uploaded, previewUrl: entry.previewUrl });
      } catch (cause) {
        if (isApiError(cause) && cause.status === 503) {
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

    if (done.length > 0) onChange([...images, ...done]);
  };

  const removeImage = (objectKey: string) => {
    const target = images.find((image) => image.objectKey === objectKey);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(images.filter((image) => image.objectKey !== objectKey));
  };

  if (unavailable) {
    return (
      <p className="text-sm text-muted-foreground">
        Image upload is not configured on this server yet.
      </p>
    );
  }

  return (
    <div>
      <div
        onDragEnter={(event) => {
          if (event.dataTransfer.types.includes("Files"))
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
          "rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          dragDepth > 0
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground/25",
          disabled && "pointer-events-none opacity-50",
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
          · JPEG, PNG, WebP or AVIF up to 10 MB
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

      {images.length > 0 || pending.length > 0 ? (
        <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {images.map((image, index) => (
            <li
              key={image.objectKey}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <img
                src={image.previewUrl}
                alt={image.fileName}
                className="size-full object-cover"
              />
              {index === 0 ? (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                  Primary
                </span>
              ) : null}
              <IconButton
                label={`Remove ${image.fileName}`}
                size="icon-xs"
                onClick={() => removeImage(image.objectKey)}
                className="absolute right-1.5 top-1.5 size-6 bg-background/90 text-muted-foreground opacity-0 backdrop-blur-sm hover:bg-background/90 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X aria-hidden />
              </IconButton>
            </li>
          ))}

          {pending.map((entry) => (
            <li
              key={entry.id}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border bg-muted",
                entry.status === "failed" && "border-destructive/40",
              )}
            >
              <img
                src={entry.previewUrl}
                alt=""
                className="size-full object-cover opacity-50"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                {entry.status === "uploading" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setPending((current) =>
                        current.filter((item) => item.id !== entry.id),
                      )
                    }
                    title={entry.message}
                    aria-label={`Dismiss failed upload ${entry.name}`}
                    className="inline-flex flex-col items-center gap-1 text-destructive"
                  >
                    <AlertCircle className="size-4" aria-hidden />
                    <span className="text-[10px]">Failed</span>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
