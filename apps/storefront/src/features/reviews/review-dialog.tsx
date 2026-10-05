"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { OwnReview } from "@urcommerce/api-client";
import { useReviewEligibility } from "@/api/reviews";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewForm } from "./review-form";

const ineligibleMessages = {
  NOT_PURCHASED: "You can review this once your order is delivered.",
  ALREADY_REVIEWED: "You have already reviewed this product.",
  STAFF_ACCOUNT: "Store staff accounts can't post reviews.",
} as const;

function Saved({
  review,
  onClose,
}: {
  review: OwnReview;
  onClose: () => void;
}) {
  return (
    <div className="py-4 text-center" role="status">
      <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
      <p className="mt-3 font-medium">
        {review.status === "REJECTED"
          ? "Your review is saved."
          : "Thanks — your review is live."}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        It helps other shoppers choose with confidence.
      </p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Button asChild variant="outline" shape="rounded">
          <Link href={`/product/${review.product.slug}#reviews`}>
            See it on the product
          </Link>
        </Button>
        <Button shape="rounded" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

function DialogBody({
  productId,
  onClose,
}: {
  productId: string;
  onClose: () => void;
}) {
  const eligibility = useReviewEligibility(productId);
  const [saved, setSaved] = useState<OwnReview | null>(null);

  if (saved) return <Saved review={saved} onClose={onClose} />;

  if (eligibility.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const { data } = eligibility;
  if (eligibility.isError || !data) {
    return (
      <p role="alert" className="py-4 text-sm text-destructive">
        We could not open the review form. Please try again.
      </p>
    );
  }

  if (data.review) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        You have already reviewed this product. Reviews can&apos;t be changed
        once posted.
      </p>
    );
  }

  if (!data.canReview) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        {data.reason
          ? ineligibleMessages[data.reason]
          : "This product can't be reviewed right now."}
      </p>
    );
  }

  return (
    <ReviewForm
      productId={productId}
      idPrefix={`dialog-${productId}`}
      onSaved={setSaved}
      onCancel={onClose}
    />
  );
}

export function ReviewDialog({
  productId,
  productName,
  onClose,
}: {
  productId: string;
  productName: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      onClose={onClose}
      labelledBy="review-dialog-title"
      className="max-w-lg"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Rate your purchase
      </p>
      <h2
        id="review-dialog-title"
        className="mb-5 mt-1 pr-8 font-display text-xl font-semibold"
      >
        {productName}
      </h2>
      <DialogBody productId={productId} onClose={onClose} />
    </Dialog>
  );
}
