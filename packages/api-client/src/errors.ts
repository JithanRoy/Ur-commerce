export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors?: string[],
    readonly path?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isValidation(): boolean {
    return this.status === 400 || this.status === 422;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  get isWrongStoreOrForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
