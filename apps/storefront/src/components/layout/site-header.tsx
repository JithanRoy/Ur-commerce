import Link from "next/link";
import { Search, ShoppingBag, User } from "lucide-react";

const navigation = [
  { label: "Shop", href: "/shop" },
  { label: "Categories", href: "/shop" },
  { label: "Brands", href: "/brand" },
];

export function SiteHeader({ storeName }: { storeName: string }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-6">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight"
        >
          {storeName}
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/shop"
            aria-label="Search"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Search className="size-[18px]" />
          </Link>
          <Link
            href="/account/orders"
            aria-label="Your orders"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <User className="size-[18px]" />
          </Link>
          <Link
            href="/cart"
            aria-label="Cart"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ShoppingBag className="size-[18px]" />
          </Link>
        </div>
      </div>
    </header>
  );
}
