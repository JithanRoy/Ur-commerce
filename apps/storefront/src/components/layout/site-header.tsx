"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { SearchField } from "@/features/shop/search-field";
import { AccountMenu } from "@/features/account/account-menu";
import { CartIndicator } from "@/features/cart/cart-indicator";
import { IconButton } from "@/components/ui/button";

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
          <IconButton
            label={searchOpen ? "Close search" : "Search"}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((open) => !open)}
            className="size-9 text-muted-foreground lg:hidden"
          >
            {searchOpen ? (
              <X className="size-[18px]" />
            ) : (
              <Search className="size-[18px]" />
            )}
          </IconButton>
          <AccountMenu />
          <CartIndicator />
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
