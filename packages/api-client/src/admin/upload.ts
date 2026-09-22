import type { UploadTicket } from "./types";

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export class UploadError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}

export function describeFileRejection(file: File): string | null {
  const accepted: readonly string[] = ACCEPTED_IMAGE_TYPES;
  if (!accepted.includes(file.type)) {
    return file.type === "image/svg+xml"
      ? "SVG files are not accepted. Use JPEG, PNG, WebP or AVIF."
      : "Use a JPEG, PNG, WebP or AVIF image.";
  }
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_IMAGE_BYTES) return "Images must be 10 MB or smaller.";
  return null;
}

export async function putToStorage(
  ticket: UploadTicket,
  file: File,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: ticket.requiredHeaders,
      body: file,
    });
  } catch {
    throw new UploadError(
      "Could not reach the storage service. Check your connection and try again.",
    );
  }

  if (response.ok) return;

  if (response.status === 403) {
    throw new UploadError(
      "Storage rejected the upload signature. The upload link may have expired — try again.",
      403,
    );
  }

  throw new UploadError(
    `Storage refused the upload (${response.status}).`,
    response.status,
  );
}
