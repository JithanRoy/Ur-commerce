import Link from "next/link";
import type { ProductQuery } from "@urcommerce/api-client";
import { buildShopHref } from "./search-params";

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
        <Link
          href={buildShopHref(query, { page: page - 1 }, basePath)}
          rel="prev"
          className="inline-flex h-10 items-center rounded-md border px-4 text-sm transition-colors hover:bg-muted"
        >
          Previous
        </Link>
      ) : (
        <span />
      )}

      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>

      {page < totalPages ? (
        <Link
          href={buildShopHref(query, { page: page + 1 }, basePath)}
          rel="next"
          className="inline-flex h-10 items-center rounded-md border px-4 text-sm transition-colors hover:bg-muted"
        >
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
