"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { REVIEW_SORTS } from "@urcommerce/api-client";
import type { ReviewSort } from "@urcommerce/api-client";
import { useProductReviews } from "@/api/reviews";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingSummary } from "./rating-summary";
import { ReviewItem } from "./review-item";
import { YourReview } from "./your-review";

const PAGE_SIZE = 5;

export const FIRST_REVIEWS_PAGE = {
  sort: "newest",
  page: 1,
  limit: PAGE_SIZE,
} as const;

const SORT_LABELS: Record<ReviewSort, string> = {
  newest: "Newest",
  highest: "Highest rated",
  lowest: "Lowest rated",
};

const SORT_OPTIONS = REVIEW_SORTS.map((sort) => ({
  value: sort,
  label: SORT_LABELS[sort],
}));

function isReviewSort(value: string): value is ReviewSort {
  return (REVIEW_SORTS as readonly string[]).includes(value);
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      {[0, 1].map((row) => (
        <div key={row} className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function NoReviewsYet() {
  return (
    <div className="rounded-xl border border-dashed px-6 py-10 text-center">
      <MessageSquareText
        className="mx-auto size-8 text-muted-foreground/40"
        aria-hidden
      />
      <p className="mt-3 font-medium">No reviews yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Reviews come from shoppers whose order was delivered.
      </p>
    </div>
  );
}

export function ProductReviews({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) {
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [rating, setRating] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const query =
    sort === "newest" && page === 1 && !rating
      ? FIRST_REVIEWS_PAGE
      : { sort, page, limit: PAGE_SIZE, ...(rating ? { rating } : {}) };
  const { data, isPending, isError, isPlaceholderData } = useProductReviews(
    productSlug,
    query,
  );
  const hasReviews = (data?.summary.count ?? 0) > 0;

  const filterBy = (next: number | null) => {
    setRating(next);
    setPage(1);
  };

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="mt-14 scroll-mt-24 border-t pt-10"
    >
      <h2 id="reviews-heading" className="font-display text-2xl font-semibold">
        Customer reviews
      </h2>

      <div className="mt-6 grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {data && hasReviews ? (
            <RatingSummary
              summary={data.summary}
              activeRating={rating}
              onFilter={filterBy}
            />
          ) : null}
          <YourReview productId={productId} productSlug={productSlug} />
        </aside>

        <div className="min-w-0">
          {isPending ? (
            <ReviewsSkeleton />
          ) : isError || !data ? (
            <p className="text-sm text-muted-foreground">
              Reviews could not be loaded right now.
            </p>
          ) : !hasReviews ? (
            <NoReviewsYet />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <p className="text-sm text-muted-foreground">
                  {rating ? (
                    <>
                      Showing {data.total} {rating}-star review
                      {data.total === 1 ? "" : "s"} ·{" "}
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => filterBy(null)}
                        className="text-sm"
                      >
                        Show all
                      </Button>
                    </>
                  ) : (
                    `${data.total} review${data.total === 1 ? "" : "s"}`
                  )}
                </p>
                <Select
                  size="sm"
                  aria-label="Sort reviews"
                  value={sort}
                  options={SORT_OPTIONS}
                  containerClassName="w-40"
                  onChange={(event) => {
                    const value = event.target.value;
                    if (isReviewSort(value)) {
                      setSort(value);
                      setPage(1);
                    }
                  }}
                />
              </div>

              <div
                className={
                  isPlaceholderData
                    ? "opacity-60 transition-opacity"
                    : "transition-opacity"
                }
              >
                {data.items.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No {rating}-star reviews.
                  </p>
                ) : (
                  <div className="divide-y">
                    {data.items.map((review) => (
                      <ReviewItem key={review.id} review={review} />
                    ))}
                  </div>
                )}
              </div>

              {data.totalPages > 1 ? (
                <nav
                  aria-label="Review pages"
                  className="mt-4 flex items-center justify-between border-t pt-4"
                >
                  <Button
                    size="sm"
                    shape="rounded"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    Page {data.page} of {data.totalPages}
                  </span>
                  <Button
                    size="sm"
                    shape="rounded"
                    variant="outline"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
