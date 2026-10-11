import { SUBDOMAIN_MAX_LENGTH } from "@urcommerce/api-client";

export function suggestSubdomain(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SUBDOMAIN_MAX_LENGTH)
    .replace(/-+$/g, "");
}
