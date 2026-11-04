import { apiFailure, apiTargetUrl, forwardToApi } from "@urcommerce/api-client";
import { apiBaseUrl, shopperTenantHeaders } from "@/lib/api";

export const dynamic = "force-dynamic";

async function proxy(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  const target = apiTargetUrl(apiBaseUrl, path, new URL(request.url).search);
  if (!target) return apiFailure(400, "That address is not part of the API.");
  return forwardToApi(request, target, await shopperTenantHeaders());
}

export {
  proxy as DELETE,
  proxy as GET,
  proxy as PATCH,
  proxy as POST,
  proxy as PUT,
};
