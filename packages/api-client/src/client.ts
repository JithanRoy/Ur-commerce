import { ApiError } from "./errors";

type Envelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type ErrorBody = {
  success: false;
  message?: string;
  errors?: string[];
  path?: string;
};

export type ClientConfig = {
  baseUrl: string;
  getAccessToken?: () => string | null | undefined;
  getCartSession?: () => string | null | undefined;
  devTenantHost?: string;
  onUnauthenticated?: () => void;
};

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  withCartSession?: boolean;
  signal?: AbortSignal;
};

function buildPath(
  path: string,
  query: RequestOptions["query"],
): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function createApiClient(config: ClientConfig) {
  async function request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const headers = new Headers();
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    const token = config.getAccessToken?.();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    if (config.devTenantHost) {
      headers.set("X-Tenant-Host", config.devTenantHost);
    }

    if (options.withCartSession) {
      const cartSession = config.getCartSession?.();
      if (cartSession) headers.set("X-Cart-Session", cartSession);
    }

    const response = await fetch(
      `${config.baseUrl}${buildPath(path, options.query)}`,
      {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
      },
    );

    const raw: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const body = (raw ?? {}) as ErrorBody;
      if (response.status === 401) config.onUnauthenticated?.();
      throw new ApiError(
        response.status,
        body.message ?? response.statusText,
        body.errors,
        body.path,
      );
    }

    const envelope = raw as Envelope<T>;
    if (!envelope || envelope.success === false) {
      throw new ApiError(
        response.status,
        (envelope as unknown as ErrorBody)?.message ?? "Request failed",
      );
    }

    return envelope.data;
  }

  return {
    request,
    get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "GET" }),
    post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "POST", body }),
    patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "PATCH", body }),
    put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "PUT", body }),
    delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "DELETE" }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
