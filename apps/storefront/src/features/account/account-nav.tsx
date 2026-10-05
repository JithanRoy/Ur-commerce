"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Package, Star, UserRound } from "lucide-react";
import { useReviewSummary } from "@/api/reviews";
import { cn } from "@/lib/utils";

const sections = [
  { href: "/account", label: "Profile", icon: UserRound },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/reviews", label: "Reviews", icon: Star },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  return href === "/account"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function CountBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-primary-foreground",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function AccountNav() {
  const pathname = usePathname();
  const { data: summary } = useReviewSummary();
  const toReview = summary?.awaiting ?? 0;

  return (
    <nav aria-label="Account" className="-mx-4 mb-8 overflow-x-auto px-4">
      <ul className="flex w-max gap-1 rounded-full border bg-muted/40 p-1">
        {sections.map((section) => {
          const current = isCurrent(pathname, section.href);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                  current
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <section.icon className="size-4" aria-hidden />
                {section.label}
                {section.href === "/account/reviews" && toReview > 0 ? (
                  <CountBadge count={toReview} />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
