import { putToStorage } from "@urcommerce/api-client";
import type { UploadScope, UploadTicket } from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import {
  useApiMutation,
  useApiRequest,
  type ApiMutationOverrides,
} from "./use-api-mutation";

function ticketInput(file: File) {
  return {
    fileName: file.name,
    contentType: file.type,
    contentLength: file.size,
  };
}

async function storeFile(ticket: UploadTicket, file: File): Promise<string> {
  await putToStorage(ticket, file);
  return ticket.objectKey;
}

async function uploadScopedImage(
  scope: UploadScope,
  file: File,
): Promise<string> {
  const ticket = await adminApi.uploads.imageTicket({
    scope,
    ...ticketInput(file),
  });
  return storeFile(ticket, file);
}

async function uploadProductImage(file: File): Promise<string> {
  const ticket = await adminApi.uploads.productImageTicket(ticketInput(file));
  return storeFile(ticket, file);
}

export function useUploadImage<TOnMutateResult = unknown>(
  scope: UploadScope,
  options: ApiMutationOverrides<string, File, TOnMutateResult> = {},
) {
  return useApiMutation({
    ...options,
    mutationFn: (file: File) => uploadScopedImage(scope, file),
  });
}

export function useImageUploader(scope: UploadScope) {
  return useApiRequest((file: File) => uploadScopedImage(scope, file));
}

export function useProductImageUploader() {
  return useApiRequest(uploadProductImage);
}
