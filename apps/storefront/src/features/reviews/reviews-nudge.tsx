"use client";

import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { useReviewSummary } from "@/api/reviews";

export function ReviewsNudge() {
  const { data } = useReviewSummary();
  if (!data || data.awaiting === 0) return null;
  const count = data.awaiting;

  return (
    <Link
      href="/account/reviews"
      className="group mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 transition-colors hover:border-primary/40"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Star className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">
          {count} {count === 1 ? "purchase" : "purchases"} waiting for your
          review
        </span>
        <span className="block text-xs text-muted-foreground">
          Tell other shoppers how the fit and quality turned out.
        </span>
      </span>
      <ChevronRight
        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}
