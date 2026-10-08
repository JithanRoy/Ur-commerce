import {
  ACCEPTED_IMAGE_TYPES,
  REVIEW_IMAGE_MAX_BYTES,
} from "@urcommerce/api-client";

const LONGEST_EDGE = 1600;
const SHRINK_ABOVE_BYTES = 1024 * 1024;
const JPEG_QUALITY = 0.85;

export const REVIEW_PHOTO_ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");

export function reviewPhotoRejection(file: File): string | null {
  const accepted: readonly string[] = ACCEPTED_IMAGE_TYPES;
  if (!accepted.includes(file.type)) {
    return "Use a JPEG, PNG, WebP or AVIF photo.";
  }
  if (file.size === 0) return "That file is empty.";
  return null;
}

function scaleFor(width: number, height: number): number {
  return Math.min(1, LONGEST_EDGE / Math.max(width, height));
}

async function toJpeg(file: File): Promise<File | null> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;
  const scale = scaleFor(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) return null;
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

export async function prepareReviewPhoto(file: File): Promise<File> {
  const shrunk = file.size > SHRINK_ABOVE_BYTES ? await toJpeg(file) : null;
  const upload = shrunk && shrunk.size < file.size ? shrunk : file;
  if (upload.size > REVIEW_IMAGE_MAX_BYTES) {
    throw new Error("Each photo must be under 5 MB.");
  }
  return upload;
}
