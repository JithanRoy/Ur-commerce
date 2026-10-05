import { useState } from "react";
import type { ReviewStatus } from "@urcommerce/api-client";
import { useReviews } from "@/api/reviews";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { ReviewModerationCard } from "@/features/reviews/review-moderation-card";
import { useListParams } from "@/lib/list-params";
import { cn } from "@/lib/utils";

const MODERATED_STATUSES = [
  "APPROVED",
  "REJECTED",
] as const satisfies readonly ReviewStatus[];

const STATUS_FILTERS: {
  value: (typeof MODERATED_STATUSES)[number] | "";
  label: string;
}[] = [
  { value: "", label: "All" },
  { value: "APPROVED", label: "Published" },
  { value: "REJECTED", label: "Hidden" },
];

const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  ...[5, 4, 3, 2, 1].map((stars) => ({
    value: String(stars),
    label: `${stars} star${stars === 1 ? "" : "s"}`,
  })),
];

export function ReviewsRoute() {
  const { page, status, setPage, setStatus } =
    useListParams(MODERATED_STATUSES);
  const [rating, setRating] = useState<number | null>(null);
  const { data, isPending, isPlaceholderData, error } = useReviews({
    page,
    status,
    rating,
  });
  const filtered = status !== "" || rating !== null;

  return (
    <>
      <PageHeader
        title="Reviews"
        count={data?.total}
        description="What customers say about your products. Hide a review to take it off the store and out of the star rating."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.label}
            variant={status === filter.value ? "primary" : "outline"}
            shape="pill"
            size="sm"
            onClick={() => setStatus(filter.value)}
            className={cn(
              "h-9 px-3.5",
              status !== filter.value &&
                "bg-card text-muted-foreground shadow-none hover:bg-card",
            )}
          >
            {filter.label}
          </Button>
        ))}
        <Select
          aria-label="Filter by rating"
          size="sm"
          value={rating ? String(rating) : ""}
          options={RATING_OPTIONS}
          containerClassName="ml-auto w-36"
          className="h-9"
          onChange={(event) => {
            setRating(event.target.value ? Number(event.target.value) : null);
            if (page !== 1) setPage(1);
          }}
        />
      </div>

      {isPending ? (
        <LoadingState variant="panels" label="Loading reviews" />
      ) : null}

      {error ? (
        <ErrorState
          message={
            error instanceof Error ? error.message : "Could not load reviews."
          }
        />
      ) : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          title={filtered ? "No matching reviews" : "No reviews yet"}
          description={
            filtered
              ? "Try a different filter."
              : "Customers can review products once their order is delivered."
          }
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <ul
            aria-busy={isPlaceholderData}
            className={cn(
              "space-y-3 transition-opacity duration-200",
              isPlaceholderData && "opacity-60",
            )}
          >
            {data.items.map((review) => (
              <ReviewModerationCard key={review.id} review={review} />
            ))}
          </ul>

          {data.totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
