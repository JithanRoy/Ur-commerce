const LOCAL_SUFFIX = ".localhost";

export function localStoreHost(host: string | null | undefined): string | null {
  const hostname = (host ?? "").split(":")[0]?.toLowerCase() ?? "";
  return hostname.endsWith(LOCAL_SUFFIX) &&
    hostname.length > LOCAL_SUFFIX.length
    ? hostname
    : null;
}
