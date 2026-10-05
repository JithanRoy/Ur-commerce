"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import type {
  OrderItem,
  OrderLineReview as OrderLineReviewState,
} from "@urcommerce/api-client";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/ui/stars";
import { ReviewDialog } from "./review-dialog";

export function OrderLineReview({
  item,
  showUnavailable = false,
}: {
  item: OrderItem;
  showUnavailable?: boolean;
}) {
  const [writing, setWriting] = useState(false);
  const review = item.review;
  if (!review || !item.productId) return null;

  const dialog = writing ? (
    <ReviewDialog
      productId={item.productId}
      productName={item.productName}
      onClose={() => setWriting(false)}
    />
  ) : null;

  return (
    <>
      <LineAction
        review={review}
        showUnavailable={showUnavailable}
        onWrite={() => setWriting(true)}
      />
      {dialog}
    </>
  );
}

function LineAction({
  review,
  showUnavailable,
  onWrite,
}: {
  review: OrderLineReviewState;
  showUnavailable: boolean;
  onWrite: () => void;
}) {
  if (review.state === "UNAVAILABLE") {
    return showUnavailable ? (
      <p className="text-xs text-muted-foreground">
        No longer on sale, so it can&apos;t be reviewed.
      </p>
    ) : null;
  }

  if (review.state === "NOT_DELIVERED") return null;

  if (review.state === "AVAILABLE") {
    return (
      <Button
        size="sm"
        shape="rounded"
        variant="soft"
        leading={<Star aria-hidden />}
        onClick={onWrite}
      >
        Write a review
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>You rated</span>
        <Stars value={review.rating} size="xs" />
      </span>
      {review.status === "REJECTED" ? (
        <span className="text-xs text-muted-foreground">
          · Not shown on the store
        </span>
      ) : null}
    </div>
  );
}
