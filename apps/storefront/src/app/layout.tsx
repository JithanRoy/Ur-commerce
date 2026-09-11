import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { defaultTheme, themeStyle } from "@/lib/theme";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: defaultTheme.name,
  description: "Shop the latest collection.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" style={themeStyle(defaultTheme)}>
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <SiteHeader storeName={defaultTheme.name} />
          <div className="flex-1">{children}</div>
          <SiteFooter storeName={defaultTheme.name} />
        </Providers>
      </body>
    </html>
  );
}
