import Link from "next/link";
import type { ProductQuery, ProductSort } from "@urcommerce/api-client";
import { buildShopHref } from "./search-params";
import { cn } from "@/lib/utils";

const options: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
];

export function SortLinks({ query }: { query: ProductQuery }) {
  const active = query.sort ?? "newest";

  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => (
        <Link
          key={option.value}
          href={buildShopHref(query, { sort: option.value, page: 1 })}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm transition-colors",
            active === option.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
