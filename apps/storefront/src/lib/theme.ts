import type { StoreProfile } from "@urcommerce/api-client";

export type StoreTheme = {
  name: string;
  tagline: string | null;
  brandHue: number;
  brandChroma: number;
  accentHue: number;
  accentChroma: number;
  onPrimary: "light" | "dark";
  onAccent: "light" | "dark";
};

export const defaultTheme: StoreTheme = {
  name: "Store",
  tagline: null,
  brandHue: 24,
  brandChroma: 0.13,
  accentHue: 24,
  accentChroma: 0.06,
  onPrimary: "light",
  onAccent: "light",
};

function srgbToLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

type Oklch = { l: number; c: number; h: number };

function hexToOklch(hex: string): Oklch | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match?.[1]) return null;

  const value = match[1];
  const r = srgbToLinear(parseInt(value.slice(0, 2), 16) / 255);
  const g = srgbToLinear(parseInt(value.slice(2, 4), 16) / 255);
  const b = srgbToLinear(parseInt(value.slice(4, 6), 16) / 255);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const chroma = Math.sqrt(okA * okA + okB * okB);
  const hue = ((Math.atan2(okB, okA) * 180) / Math.PI + 360) % 360;

  return { l: okL, c: chroma, h: hue };
}

export function themeFromStore(store: StoreProfile): StoreTheme {
  const primary = hexToOklch(store.theme.primaryColor);
  const accent = hexToOklch(store.theme.accentColor);

  return {
    name: store.storeName,
    tagline: store.tagline,
    brandHue: primary?.h ?? defaultTheme.brandHue,
    brandChroma: primary?.c ?? defaultTheme.brandChroma,
    accentHue: accent?.h ?? defaultTheme.accentHue,
    accentChroma: accent?.c ?? defaultTheme.accentChroma,
    onPrimary: store.theme.onPrimary,
    onAccent: store.theme.onAccent,
  };
}

export function themeStyle(theme: StoreTheme): React.CSSProperties {
  return {
    "--brand-hue": String(Math.round(theme.brandHue)),
    "--brand-chroma": theme.brandChroma.toFixed(3),
    "--accent-hue": String(Math.round(theme.accentHue)),
    "--accent-chroma": theme.accentChroma.toFixed(3),
    "--on-primary-l": theme.onPrimary === "light" ? "0.99" : "0.18",
  } as React.CSSProperties;
}
