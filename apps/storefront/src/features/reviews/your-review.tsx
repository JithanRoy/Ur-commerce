"use client";

import { useState } from "react";
import Link from "next/link";
import { PenLine } from "lucide-react";
import type { OwnReview } from "@urcommerce/api-client";
import { useDeleteReview, useReviewEligibility } from "@/api/reviews";
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

function OwnReviewSummary({
  review,
  onEdit,
}: {
  review: OwnReview;
  onEdit: () => void;
}) {
  const remove = useDeleteReview();
  const [confirming, setConfirming] = useState(false);

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
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
          <p className="mr-auto text-sm">Delete your review?</p>
          <Button
            size="sm"
            shape="rounded"
            variant="destructive"
            loading={remove.isPending}
            loadingText="Deleting…"
            onClick={() => remove.mutate(review.id)}
          >
            Delete
          </Button>
          <Button
            size="sm"
            shape="rounded"
            variant="ghost"
            onClick={() => setConfirming(false)}
          >
            Keep
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" shape="rounded" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button
            size="sm"
            shape="rounded"
            variant="destructive-ghost"
            onClick={() => setConfirming(true)}
          >
            Delete
          </Button>
        </div>
      )}
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
  const [editing, setEditing] = useState(false);
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

  if (eligibility.review && !editing) {
    return (
      <Panel>
        {justPosted ? (
          <p role="status" className="mb-3 text-sm font-medium text-success">
            Thanks — your review is live.
          </p>
        ) : null}
        <OwnReviewSummary
          review={eligibility.review}
          onEdit={() => setEditing(true)}
        />
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
        {eligibility.review ? "Edit your review" : "Write a review"}
      </p>
      <ReviewForm
        productId={productId}
        existing={eligibility.review}
        onSaved={() => {
          setJustPosted(!eligibility.review);
          setEditing(false);
        }}
        onCancel={eligibility.review ? () => setEditing(false) : undefined}
      />
    </Panel>
  );
}
