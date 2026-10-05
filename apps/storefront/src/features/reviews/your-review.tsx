"use client";

import { useState } from "react";
import Link from "next/link";
import { PenLine } from "lucide-react";
import type { OwnReview } from "@urcommerce/api-client";
import { useReviewEligibility } from "@/api/reviews";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Stars } from "@/components/ui/stars";
import { useAuth } from "@/stores/auth";
import { ReviewForm } from "./review-form";

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="write-review"
      className="scroll-mt-24 rounded-xl border bg-card p-5"
    >
      {children}
    </div>
  );
}

function OwnReviewSummary({ review }: { review: OwnReview }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Your review</p>
        <Stars value={review.rating} size="sm" />
      </div>
      {review.title ? (
        <p className="text-sm font-semibold">{review.title}</p>
      ) : null}
      {review.body ? (
        <p className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
          {review.body}
        </p>
      ) : null}
      {review.status === "REJECTED" ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          This review isn&apos;t shown on the store.
        </p>
      ) : null}
    </div>
  );
}

export function YourReview({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) {
  const signedIn = useAuth((state) => Boolean(state.session));
  const {
    data: eligibility,
    isPending,
    isError,
  } = useReviewEligibility(productId);
  const [justPosted, setJustPosted] = useState(false);

  if (!signedIn) {
    return (
      <Panel>
        <p className="text-sm font-medium">Bought this?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to share what you thought once your order arrives.
        </p>
        <Button
          asChild
          size="sm"
          shape="rounded"
          variant="outline"
          className="mt-3"
        >
          <Link
            href={`/login?returnTo=${encodeURIComponent(`/product/${productSlug}#write-review`)}`}
          >
            Sign in to review
          </Link>
        </Button>
      </Panel>
    );
  }

  if (isPending) {
    return (
      <Panel>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-8 w-40" />
      </Panel>
    );
  }

  if (isError || !eligibility || eligibility.reason === "STAFF_ACCOUNT")
    return null;

  if (eligibility.review) {
    return (
      <Panel>
        {justPosted ? (
          <p role="status" className="mb-3 text-sm font-medium text-success">
            Thanks — your review is live.
          </p>
        ) : null}
        <OwnReviewSummary review={eligibility.review} />
      </Panel>
    );
  }

  if (eligibility.reason === "NOT_PURCHASED") {
    return (
      <Panel>
        <p className="text-sm font-medium">Reviews come from buyers</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You can review this after your order is delivered.
        </p>
      </Panel>
    );
  }

  return (
    <Panel>
      <p className="mb-4 flex items-center gap-2 text-sm font-medium">
        <PenLine className="size-4 text-primary" aria-hidden />
        Write a review
      </p>
      <ReviewForm productId={productId} onSaved={() => setJustPosted(true)} />
    </Panel>
  );
}
