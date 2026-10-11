const DEFAULT_STOREFRONT_TEMPLATE = "http://{subdomain}.localhost:3100";
const DEFAULT_ADMIN_TEMPLATE = "http://{subdomain}.localhost:5273";

function fill(template: string, subdomain: string): string {
  return template.replace("{subdomain}", subdomain);
}

export function storefrontUrl(subdomain: string): string {
  return fill(
    import.meta.env.VITE_STOREFRONT_ORIGIN_TEMPLATE ??
      DEFAULT_STOREFRONT_TEMPLATE,
    subdomain,
  );
}

export function adminUrl(subdomain: string): string {
  return fill(
    import.meta.env.VITE_ADMIN_ORIGIN_TEMPLATE ?? DEFAULT_ADMIN_TEMPLATE,
    subdomain,
  );
}

export function displayHost(url: string): string {
  return url.replace(/^https?:\/\//, "");
}
