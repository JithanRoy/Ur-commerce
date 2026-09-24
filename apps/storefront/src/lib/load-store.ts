import type { StoreProfile } from "@urcommerce/api-client";
import { storefront } from "@/lib/api";
import { defaultTheme, themeFromStore, type StoreTheme } from "@/lib/theme";

export async function loadStoreTheme(): Promise<{
  store: StoreProfile | null;
  theme: StoreTheme;
}> {
  try {
    const store = await storefront.store();
    return { store, theme: themeFromStore(store) };
  } catch (error) {
    console.error("GET /store failed, falling back to the default theme", error);
    return { store: null, theme: defaultTheme };
  }
}
