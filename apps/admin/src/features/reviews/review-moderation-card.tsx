import { Link } from "react-router";
import { BadgeCheck, Eye, EyeOff } from "lucide-react";
import type { AdminReview } from "@urcommerce/api-client";
import { useModerateReview } from "@/api/reviews";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/ui/stars";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ReviewStatusBadge({ status }: { status: AdminReview["status"] }) {
  const hidden = status === "REJECTED";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        hidden
          ? "bg-muted text-muted-foreground"
          : "bg-success/12 text-success",
      )}
    >
      {hidden ? "Hidden" : "Published"}
    </span>
  );
}

export function ReviewModerationCard({ review }: { review: AdminReview }) {
  const moderate = useModerateReview();
  const hidden = review.status === "REJECTED";

  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-4 transition-colors",
        hidden && "border-dashed bg-muted/30",
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Stars value={review.rating} size="sm" />
            <ReviewStatusBadge status={review.status} />
            {review.isVerifiedPurchase ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <BadgeCheck className="size-3.5 text-success" aria-hidden />
                Verified purchase
              </span>
            ) : null}
          </div>
          <Link
            to={`/products/${review.product.id}`}
            className="mt-1.5 block truncate text-sm font-medium hover:underline"
          >
            {review.product.name}
          </Link>
        </div>

        <Button
          size="sm"
          variant={hidden ? "outline" : "destructive-ghost"}
          leading={hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
          loading={moderate.isPending}
          loadingText={hidden ? "Restoring…" : "Hiding…"}
          onClick={() =>
            moderate.mutate({
              id: review.id,
              status: hidden ? "APPROVED" : "REJECTED",
            })
          }
        >
          {hidden ? "Restore" : "Hide"}
        </Button>
      </div>

      {review.title ? (
        <p className="mt-3 text-sm font-semibold">{review.title}</p>
      ) : null}
      {review.body ? (
        <p className="mt-1 whitespace-pre-line text-sm text-foreground/85">
          {review.body}
        </p>
      ) : null}
      {!review.title && !review.body ? (
        <p className="mt-3 text-sm italic text-muted-foreground">
          Stars only, no written review.
        </p>
      ) : null}

      <p className="mt-3 flex flex-wrap gap-x-2 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{review.user.name}</span>
        <span>{review.user.email}</span>
        <span aria-hidden>·</span>
        <span>Shown as “{review.authorName}”</span>
        <span aria-hidden>·</span>
        <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
        <span aria-hidden>·</span>
        <Link to={`/orders/${review.orderId}`} className="hover:underline">
          View order
        </Link>
      </p>
    </li>
  );
}
