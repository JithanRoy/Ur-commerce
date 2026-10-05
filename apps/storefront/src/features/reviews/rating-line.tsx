"use client";

import { roundedRating } from "@urcommerce/api-client";
import { useProductReviews } from "@/api/reviews";
import { Stars } from "@/components/ui/stars";
import { FIRST_REVIEWS_PAGE } from "./product-reviews";

export function RatingLine({
  productSlug,
  average,
  count,
}: {
  productSlug: string;
  average: number;
  count: number;
}) {
  const { data } = useProductReviews(productSlug, FIRST_REVIEWS_PAGE);
  const live = data?.summary ?? { average, count };

  if (live.count === 0) {
    return (
      <a
        href="#reviews"
        className="mt-2 inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        No reviews yet
      </a>
    );
  }

  return (
    <a
      href="#reviews"
      className="group mt-2 inline-flex items-center gap-2 text-sm"
      aria-label={`Rated ${roundedRating(live.average)} out of 5 from ${live.count} reviews. Read the reviews`}
    >
      <Stars value={live.average} size="sm" decorative />
      <span className="font-medium tabular-nums">
        {roundedRating(live.average).toFixed(1)}
      </span>
      <span className="text-muted-foreground underline-offset-4 group-hover:underline">
        {live.count} review{live.count === 1 ? "" : "s"}
      </span>
    </a>
  );
}
