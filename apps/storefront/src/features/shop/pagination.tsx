import Link from "next/link";
import type { ProductQuery } from "@urcommerce/api-client";
import { buildShopHref } from "./search-params";
import { Button } from "@/components/ui/button";

type Props = {
  query: ProductQuery;
  basePath?: string;
  page: number;
  totalPages: number;
};

export function Pagination({
  query,
  page,
  totalPages,
  basePath = "/shop",
}: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-between border-t pt-6"
    >
      {page > 1 ? (
        <Button
          asChild
          variant="outline"
          size="md"
          className="border-border font-normal shadow-none"
        >
          <Link
            href={buildShopHref(query, { page: page - 1 }, basePath)}
            rel="prev"
          >
            Previous
          </Link>
        </Button>
      ) : (
        <span />
      )}

      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>

      {page < totalPages ? (
        <Button
          asChild
          variant="outline"
          size="md"
          className="border-border font-normal shadow-none"
        >
          <Link
            href={buildShopHref(query, { page: page + 1 }, basePath)}
            rel="next"
          >
            Next
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
