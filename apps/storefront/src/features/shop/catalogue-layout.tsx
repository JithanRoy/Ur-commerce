"use client";

import { useId, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CatalogueLayout({
  filters,
  sort,
  activeFilterCount,
  children,
}: {
  filters: React.ReactNode;
  sort: React.ReactNode;
  activeFilterCount: number;
  children: React.ReactNode;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[200px_1fr] lg:grid-rows-[auto_1fr] lg:gap-x-10">
      <div className="flex min-w-0 items-center gap-2 lg:col-start-2 lg:row-start-1">
        <Button
          variant="outline"
          size="lg"
          shape="pill"
          aria-expanded={filtersOpen}
          aria-controls={panelId}
          onClick={() => setFiltersOpen((open) => !open)}
          leading={<SlidersHorizontal aria-hidden />}
          className={cn(
            "shrink-0 px-4 shadow-none lg:hidden",
            (filtersOpen || activeFilterCount > 0) && "border-foreground",
          )}
        >
          Filters
          {activeFilterCount > 0 ? (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-foreground text-xs tabular-nums text-background">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
        <div className="min-w-0 flex-1">{sort}</div>
      </div>

      <div
        id={panelId}
        className={cn(
          "rounded-xl border p-4 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:block lg:rounded-none lg:border-0 lg:p-0",
          filtersOpen ? "block" : "hidden",
        )}
      >
        {filters}
      </div>

      <div className="min-w-0 lg:col-start-2 lg:row-start-2">{children}</div>
    </div>
  );
}
