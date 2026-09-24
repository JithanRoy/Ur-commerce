import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { themeStyle } from "@/lib/theme";
import { loadStoreTheme } from "@/lib/load-store";
import { Providers } from "./providers";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-loaded",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const body = Outfit({
  subsets: ["latin"],
  variable: "--font-body-loaded",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { store, theme } = await loadStoreTheme();
  return {
    title: { default: theme.name, template: `%s · ${theme.name}` },
    description: theme.tagline ?? "Shop the latest collection.",
    ...(store?.faviconUrl ? { icons: { icon: store.faviconUrl } } : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { store, theme } = await loadStoreTheme();

  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable}`}
      style={themeStyle(theme)}
    >
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <SiteHeader storeName={theme.name} logoUrl={store?.logoUrl ?? null} />
          <div className="flex-1">{children}</div>
          <SiteFooter storeName={theme.name} store={store} />
        </Providers>
      </body>
    </html>
  );
}
