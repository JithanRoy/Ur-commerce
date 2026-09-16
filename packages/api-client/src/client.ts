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
  getRefreshToken?: () => string | null | undefined;
  getCartSession?: () => string | null | undefined;
  devTenantHost?: string;
  onRefreshed?: (accessToken: string, refreshToken: string) => void;
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

const AUTH_ENDPOINTS_WITHOUT_REFRESH = ["/auth/login", "/auth/refresh", "/auth/logout"];

function isAuthEndpoint(path: string): boolean {
  return AUTH_ENDPOINTS_WITHOUT_REFRESH.some((endpoint) =>
    path.startsWith(endpoint),
  );
}

export function createApiClient(config: ClientConfig) {
  let refreshInFlight: Promise<boolean> | null = null;

  async function refreshSession(): Promise<boolean> {
    const refreshToken = config.getRefreshToken?.();
    if (!refreshToken) return false;

    const response = await fetch(`${config.baseUrl}/auth/refresh`, {
      method: "POST",
      headers: tenantHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const body = (await response.json().catch(() => null)) as
      | Envelope<{ accessToken: string; refreshToken: string }>
      | null;

    if (!body?.data?.accessToken) return false;

    config.onRefreshed?.(body.data.accessToken, body.data.refreshToken);
    return true;
  }

  function tenantHeaders(base: Record<string, string> = {}): Headers {
    const headers = new Headers(base);
    if (config.devTenantHost) {
      headers.set("X-Tenant-Host", config.devTenantHost);
    }
    return headers;
  }

  async function request<T>(
    path: string,
    options: RequestOptions = {},
    isRetry = false,
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

      if (response.status === 401) {
        const canRefresh = !isRetry && !isAuthEndpoint(path);
        if (canRefresh) {
          refreshInFlight ??= refreshSession().finally(() => {
            refreshInFlight = null;
          });
          if (await refreshInFlight) {
            return request<T>(path, options, true);
          }
        }
        config.onUnauthenticated?.();
      }

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
