"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Search, ShoppingBag, User, X } from "lucide-react";
import { SearchField } from "@/features/shop/search-field";

const navigation = [
  { label: "Shop", href: "/shop" },
  { label: "Brands", href: "/brand" },
];

export function SiteHeader({
  storeName,
  logoUrl,
}: {
  storeName: string;
  logoUrl?: string | null;
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-display text-xl font-semibold tracking-tight"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={storeName}
              className="h-7 w-auto object-contain"
            />
          ) : (
            storeName
          )}
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

        <div className="ml-auto hidden w-full max-w-xs lg:block">
          <Suspense fallback={null}>
            <SearchField />
          </Suspense>
        </div>

        <div className="ml-auto flex items-center gap-1 lg:ml-2">
          <button
            type="button"
            aria-label={searchOpen ? "Close search" : "Search"}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((open) => !open)}
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          >
            {searchOpen ? (
              <X className="size-[18px]" />
            ) : (
              <Search className="size-[18px]" />
            )}
          </button>
          <Link
            href="/account/orders"
            aria-label="Your orders"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <User className="size-[18px]" />
          </Link>
          <Link
            href="/cart"
            aria-label="Your cart"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ShoppingBag className="size-[18px]" />
          </Link>
        </div>
      </div>

      {searchOpen ? (
        <div className="border-t px-4 py-3 lg:hidden">
          <div className="container-page px-0">
            <Suspense fallback={null}>
              <SearchField autoFocus onDone={() => setSearchOpen(false)} />
            </Suspense>
          </div>
        </div>
      ) : null}
    </header>
  );
}
