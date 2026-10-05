import Link from "next/link";
import type { ProductQuery, ProductSort } from "@urcommerce/api-client";
import { buildShopHref } from "./search-params";
import { cn } from "@/lib/utils";
import { LinkPendingIndicator } from "./catalogue-navigation";

const options: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "best-sellers", label: "Best sellers" },
  { value: "top-rated", label: "Top rated" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
];

export function SortLinks({
  query,
  basePath = "/shop",
}: {
  query: ProductQuery;
  basePath?: string;
}) {
  const active = query.sort ?? "newest";

  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
      {options.map((option) => (
        <Link
          key={option.value}
          href={buildShopHref(query, { sort: option.value, page: 1 }, basePath)}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors lg:min-h-0",
            active === option.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted hover:text-foreground has-[[data-link-pending]]:bg-foreground/80 has-[[data-link-pending]]:text-background",
          )}
        >
          {option.label}
          <LinkPendingIndicator />
        </Link>
      ))}
    </div>
  );
}
