import { apiBaseUrl, shopperTenantHeaders } from "@/lib/api";

export const dynamic = "force-dynamic";

const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "user-agent",
  "x-cart-session",
];

const DROPPED_RESPONSE_HEADERS = [
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "transfer-encoding",
];

function upstreamUrl(request: Request, path: string[]): string {
  const { search } = new URL(request.url);
  return `${apiBaseUrl}/${path.map(encodeURIComponent).join("/")}${search}`;
}

async function upstreamHeaders(request: Request): Promise<Headers> {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const clientIp = request.headers.get("x-forwarded-for");
  if (clientIp) headers.set("x-forwarded-for", clientIp);
  for (const [name, value] of Object.entries(await shopperTenantHeaders())) {
    headers.set(name, value);
  }
  return headers;
}

async function proxy(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(upstreamUrl(request, path), {
    method: request.method,
    headers: await upstreamHeaders(request),
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
    redirect: "manual",
  });

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
