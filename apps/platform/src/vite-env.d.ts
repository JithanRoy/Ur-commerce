/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_STORE_HOST_SUFFIX?: string;
  readonly VITE_STOREFRONT_ORIGIN_TEMPLATE?: string;
  readonly VITE_ADMIN_ORIGIN_TEMPLATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
