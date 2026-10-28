const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "user-agent",
  "x-forwarded-for",
];

const DROPPED_RESPONSE_HEADERS = [
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "transfer-encoding",
];

const REQUIRED_ENV = ["VITE_API_URL", "STORE_HOST", "INTERNAL_API_KEY"];

function missingEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]);
}

function failure(status: number, message: string): Response {
  return Response.json({ success: false, message }, { status });
}

function upstreamUrl(request: Request): string {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "";
  url.searchParams.delete("path");
  return `${process.env.VITE_API_URL}/${path}${url.search}`;
}

function upstreamHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("X-Tenant-Host", process.env.STORE_HOST ?? "");
  headers.set("X-Internal-Key", process.env.INTERNAL_API_KEY ?? "");
  return headers;
}

async function proxy(request: Request): Promise<Response> {
  const missing = missingEnv();
  if (missing.length > 0) {
    console.error(`Admin API proxy is missing ${missing.join(", ")}`);
    return failure(500, "The admin is not connected to a store yet.");
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(upstreamUrl(request), {
    method: request.method,
    headers: upstreamHeaders(request),
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  }).catch((error: unknown) => {
    console.error("Admin API proxy could not reach the API", error);
    return null;
  });
  if (!upstream)
    return failure(502, "The store's server could not be reached.");

  const headers = new Headers(upstream.headers);
  for (const name of DROPPED_RESPONSE_HEADERS) headers.delete(name);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export {
  proxy as DELETE,
  proxy as GET,
  proxy as PATCH,
  proxy as POST,
  proxy as PUT,
};
