import { BadgeCheck } from "lucide-react";
import type { PublicReview } from "@urcommerce/api-client";
import { Stars } from "@/components/ui/stars";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatReviewDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function wasEdited(review: PublicReview): boolean {
  return (
    new Date(review.updatedAt).getTime() -
      new Date(review.createdAt).getTime() >
    1000
  );
}

export function ReviewItem({ review }: { review: PublicReview }) {
  return (
    <article className="py-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars value={review.rating} size="sm" />
        {review.title ? (
          <h3 className="text-sm font-semibold">{review.title}</h3>
        ) : null}
      </div>
      {review.body ? (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
          {review.body}
        </p>
      ) : null}
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{review.authorName}</span>
        {review.isVerifiedPurchase ? (
          <span className="inline-flex items-center gap-1 text-success">
            <BadgeCheck className="size-3.5" aria-hidden />
            Verified purchase
          </span>
        ) : null}
        <span aria-hidden>·</span>
        <time dateTime={review.createdAt}>
          {formatReviewDate(review.createdAt)}
        </time>
        {wasEdited(review) ? <span>(edited)</span> : null}
      </p>
    </article>
  );
}
