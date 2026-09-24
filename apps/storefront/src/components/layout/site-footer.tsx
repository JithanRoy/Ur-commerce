import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import type { StoreProfile } from "@urcommerce/api-client";

const columns = [
  {
    heading: "Shop",
    links: [
      { label: "All products", href: "/shop" },
      { label: "New arrivals", href: "/shop?sort=newest" },
      { label: "Brands", href: "/brand" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Orders", href: "/account/orders" },
      { label: "Addresses", href: "/account/addresses" },
    ],
  },
];

export function SiteFooter({
  storeName,
  store,
}: {
  storeName: string;
  store?: StoreProfile | null;
}) {
  const hasContact = Boolean(store?.supportEmail || store?.supportPhone);

  return (
    <footer className="mt-24 border-t bg-muted/30">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-semibold">{storeName}</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            {store?.tagline ??
              "Cash on delivery across Bangladesh. Free shipping over ৳2,000."}
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.heading}>
            <h2 className="text-sm font-medium">{column.heading}</h2>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {hasContact ? (
          <div>
            <h2 className="text-sm font-medium">Help</h2>
            <ul className="mt-3 space-y-2">
              {store?.supportEmail ? (
                <li>
                  <a
                    href={`mailto:${store.supportEmail}`}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Mail className="size-3.5" aria-hidden />
                    {store.supportEmail}
                  </a>
                </li>
              ) : null}
              {store?.supportPhone ? (
                <li>
                  <a
                    href={`tel:${store.supportPhone}`}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Phone className="size-3.5" aria-hidden />
                    {store.supportPhone}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="border-t">
        <div className="container-page py-6">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
