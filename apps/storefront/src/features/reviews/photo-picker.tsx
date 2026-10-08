"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, ImageOff, ImagePlus, RotateCw, X } from "lucide-react";
import { REVIEW_MAX_IMAGES, isApiError } from "@urcommerce/api-client";
import { useUploadReviewPhoto } from "@/api/reviews";
import { IconButton } from "@/components/ui/button";
import { FileTrigger } from "@/components/ui/file-trigger";
import { Spinner } from "@/components/ui/spinner";
import { REVIEW_PHOTO_ACCEPT, reviewPhotoRejection } from "@/lib/review-photos";
import { cn } from "@/lib/utils";

type PhotoDraft = {
  id: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  objectKey: string | null;
  error: string | null;
};

function uploadFailure(cause: unknown): string {
  if (isApiError(cause)) return cause.message;
  if (cause instanceof Error) return cause.message;
  return "Could not upload this photo.";
}

export function useReviewPhotos() {
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const { mutateAsync: upload } = useUploadReviewPhoto();
  const previews = useRef(new Set<string>());

  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const patch = useCallback((id: string, changes: Partial<PhotoDraft>) => {
    setPhotos((current) =>
      current.map((photo) =>
        photo.id === id ? { ...photo, ...changes } : photo,
      ),
    );
  }, []);

  const send = useCallback(
    async (photo: PhotoDraft) => {
      patch(photo.id, { status: "uploading", error: null });
      try {
        const { objectKey } = await upload(photo.file);
        patch(photo.id, { status: "done", objectKey });
      } catch (cause) {
        patch(photo.id, { status: "error", error: uploadFailure(cause) });
      }
    },
    [patch, upload],
  );

  function add(files: File[]) {
    const room = REVIEW_MAX_IMAGES - photos.length;
    const rejected = files.map(reviewPhotoRejection).find(Boolean) ?? null;
    const accepted = files.filter((file) => !reviewPhotoRejection(file));
    const taken = accepted.slice(0, Math.max(room, 0));
    setNotice(
      rejected ??
        (accepted.length > taken.length
          ? `You can add up to ${REVIEW_MAX_IMAGES} photos.`
          : null),
    );
    const drafts = taken.map<PhotoDraft>((file) => {
      const previewUrl = URL.createObjectURL(file);
      previews.current.add(previewUrl);
      return {
        id: crypto.randomUUID(),
        file,
        previewUrl,
        status: "uploading",
        objectKey: null,
        error: null,
      };
    });
    setPhotos((current) => [...current, ...drafts]);
    drafts.forEach((draft) => void send(draft));
  }

  function remove(id: string) {
    setNotice(null);
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  }

  return {
    photos,
    notice,
    add,
    remove,
    retry: send,
    uploading: photos.some((photo) => photo.status === "uploading"),
    failed: photos.some((photo) => photo.status === "error"),
    objectKeys: photos.flatMap((photo) =>
      photo.objectKey ? [photo.objectKey] : [],
    ),
  };
}

export type ReviewPhotos = ReturnType<typeof useReviewPhotos>;

function PhotoTile({
  photo,
  index,
  disabled,
  onRemove,
  onRetry,
}: {
  photo: PhotoDraft;
  index: number;
  disabled: boolean;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const [previewFailed, setPreviewFailed] = useState(false);
  return (
    <li className="relative size-20">
      {previewFailed ? (
        <span
          role="img"
          aria-label={`Photo ${index + 1}, can't be previewed`}
          className="flex size-full items-center justify-center rounded-lg border bg-muted text-muted-foreground"
        >
          <ImageOff className="size-5" aria-hidden />
        </span>
      ) : (
        <Image
          src={photo.previewUrl}
          alt={`Photo ${index + 1}`}
          width={80}
          height={80}
          unoptimized
          onError={() => setPreviewFailed(true)}
          className={cn(
            "size-full rounded-lg border object-cover",
            photo.status !== "done" && "opacity-50",
          )}
        />
      )}
      {photo.status === "uploading" ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size="md" label={`Uploading photo ${index + 1}`} />
        </span>
      ) : null}
      {photo.status === "error" ? (
        <IconButton
          label={`Retry photo ${index + 1}`}
          size="icon-sm"
          variant="secondary"
          onClick={onRetry}
          className="absolute inset-0 m-auto"
        >
          <RotateCw aria-hidden />
        </IconButton>
      ) : null}
      <IconButton
        label={`Remove photo ${index + 1}`}
        size="icon-xs"
        shape="pill"
        variant="secondary"
        disabled={disabled}
        onClick={onRemove}
        className="absolute -right-2 -top-2 border bg-background shadow-sm"
      >
        <X aria-hidden />
      </IconButton>
    </li>
  );
}

export function PhotoPicker({
  photos,
  disabled = false,
}: {
  photos: ReviewPhotos;
  disabled?: boolean;
}) {
  const full = photos.photos.length >= REVIEW_MAX_IMAGES;
  const errors = photos.photos.flatMap((photo) =>
    photo.error ? [photo.error] : [],
  );
  const messages = [...new Set([photos.notice, ...errors])].filter(Boolean);

  return (
    <div>
      <p className="text-sm font-medium">
        Photos{" "}
        <span className="font-normal text-muted-foreground">
          (optional, up to {REVIEW_MAX_IMAGES})
        </span>
      </p>
      <ul className="mt-2 flex flex-wrap gap-3">
        {photos.photos.map((photo, index) => (
          <PhotoTile
            key={photo.id}
            photo={photo}
            index={index}
            disabled={disabled}
            onRemove={() => photos.remove(photo.id)}
            onRetry={() => void photos.retry(photo)}
          />
        ))}
        {full ? null : (
          <li>
            <FileTrigger
              accept={REVIEW_PHOTO_ACCEPT}
              multiple
              disabled={disabled}
              label="Add photos"
              onFiles={photos.add}
              className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ImagePlus className="size-5" aria-hidden />
              Add photo
            </FileTrigger>
          </li>
        )}
      </ul>
      {messages.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {messages.map((message) => (
            <li
              key={message}
              role="alert"
              className="flex items-center gap-1.5 text-xs text-destructive"
            >
              <AlertCircle className="size-3.5 shrink-0" aria-hidden />
              {message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Show the fit, colour or fabric. JPEG, PNG, WebP or AVIF.
        </p>
      )}
    </div>
  );
}
