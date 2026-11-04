const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "user-agent",
  "x-cart-session",
  "x-forwarded-for",
];

const DROPPED_RESPONSE_HEADERS = [
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "transfer-encoding",
];

export function apiFailure(status: number, message: string): Response {
  return Response.json({ success: false, message }, { status });
}

export function apiTargetUrl(
  baseUrl: string,
  segments: readonly string[],
  search: string,
): string | null {
  const base = baseUrl.replace(/\/+$/, "");
  const target = new URL(
    `${base}/${segments.map(encodeURIComponent).join("/")}${search}`,
  );
  return target.href.startsWith(`${base}/`) ? target.href : null;
}

function upstreamHeaders(
  request: Request,
  tenantHeaders: Record<string, string>,
): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  for (const [name, value] of Object.entries(tenantHeaders)) {
    headers.set(name, value);
  }
  return headers;
}

export async function forwardToApi(
  request: Request,
  target: string,
  tenantHeaders: Record<string, string>,
): Promise<Response> {
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    method: request.method,
    headers: upstreamHeaders(request, tenantHeaders),
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
    redirect: "manual",
  }).catch((error: unknown) => {
    console.error(`API proxy could not reach ${new URL(target).host}`, error);
    return null;
  });
  if (!upstream) {
    return apiFailure(502, "The store's server could not be reached.");
  }

  const headers = new Headers(upstream.headers);
  for (const name of DROPPED_RESPONSE_HEADERS) headers.delete(name);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
