export type StoreTheme = {
  name: string;
  brandHue: number;
  brandChroma: number;
};

export const defaultTheme: StoreTheme = {
  name: "Store",
  brandHue: 24,
  brandChroma: 0.13,
};

export function themeStyle(theme: StoreTheme): React.CSSProperties {
  return {
    "--brand-hue": String(theme.brandHue),
    "--brand-chroma": String(theme.brandChroma),
  } as React.CSSProperties;
}
