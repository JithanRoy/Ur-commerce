import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
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
import { Button } from "./button";

function failureText(error: unknown, fallback: string): string {
  if (error instanceof UploadError) return error.message;
  if (isApiError(error)) return error.message;
  return fallback;
}

function isStorageUnavailable(error: unknown): boolean {
  return isApiError(error) && error.status === 503;
}

export function ImageField({
  scope,
  label,
  currentUrl,
  onUploaded,
  onCleared,
  disabled,
  hint,
  fit = "cover",
}: {
  scope: UploadScope;
  label: string;
  currentUrl: string | null;
  onUploaded: (objectKey: string, previewUrl: string) => void;
  onCleared: () => void;
  disabled?: boolean;
  hint?: string;
  fit?: "cover" | "contain";
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [broken, setBroken] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const ticket = await adminApi.uploads.imageTicket({
        scope,
        fileName: file.name,
        contentType: file.type,
        contentLength: file.size,
      });
      await putToStorage(ticket, file);
      return ticket.objectKey;
    },
    onMutate: (file: File) => {
      setError(null);
      const previewUrl = URL.createObjectURL(file);
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return previewUrl;
      });
      return previewUrl;
    },
    onSuccess: (objectKey, _file, previewUrl) => {
      setBroken(false);
      onUploaded(objectKey, previewUrl);
    },
    onError: (cause) => {
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      if (isStorageUnavailable(cause)) {
        setUnavailable(true);
        return;
      }
      setError(failureText(cause, "Could not upload that image."));
    },
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

  const busy = upload.isPending || disabled;

  if (unavailable) {
    return (
      <p className="text-sm text-muted-foreground">
        Image upload is not configured on this server yet.
      </p>
    );
  }

  const shownUrl = upload.isPending ? preview : (currentUrl ?? preview);

  return (
    <div>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          onDragEnter={(event) => {
            if (event.dataTransfer.types.includes("Files")) setDragging(true);
          }}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("Files")) {
              event.preventDefault();
            }
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            setDragging(false);
            pickFile(event.dataTransfer.files[0]);
          }}
          aria-label={currentUrl ? `Replace ${label}` : `Upload ${label}`}
          className={cn(
            "relative size-20 shrink-0 overflow-hidden rounded-lg border-2 border-dashed bg-muted/40 transition-colors disabled:opacity-60",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-foreground/30",
          )}
        >
          {shownUrl && !broken ? (
            <img
              src={shownUrl}
              alt=""
              onError={() => setBroken(true)}
              className={cn(
                "size-full",
                fit === "contain" ? "object-contain p-1.5" : "object-cover",
                upload.isPending && "opacity-40",
              )}
            />
          ) : (
            <span className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
              <ImagePlus className="size-5" aria-hidden />
              <span className="text-[10px] font-medium">Add</span>
            </span>
          )}

          {upload.isPending ? (
            <span className="absolute inset-0 flex items-center justify-center bg-background/50">
              <Loader2 className="size-5 animate-spin" aria-hidden />
            </span>
          ) : null}
        </button>

        <div className="min-w-0 pt-1">
          <p className="text-sm font-medium capitalize">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {upload.isPending
              ? "Uploading…"
              : dragging
                ? "Drop to upload"
                : "Click or drop an image"}
          </p>
          {hint ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          ) : null}

          {currentUrl ? (
            <Button
              variant="destructive-ghost"
              size="xs"
              onClick={() => {
                setBroken(false);
                setPreview((current) => {
                  if (current) URL.revokeObjectURL(current);
                  return null;
                });
                onCleared();
              }}
              disabled={busy}
              leading={<Trash2 aria-hidden />}
              className="-ml-2 mt-1 gap-1.5"
            >
              Remove {label}
            </Button>
          ) : null}
        </div>
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
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
