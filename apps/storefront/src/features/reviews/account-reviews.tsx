"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import type {
  AwaitingReviewProduct,
  OwnReview,
  ReviewProductImage,
} from "@urcommerce/api-client";
import { useAwaitingReviews, useMyReviews } from "@/api/reviews";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/page-skeletons";
import { Stars } from "@/components/ui/stars";
import { cn } from "@/lib/utils";
import { ReviewForm } from "./review-form";
import { formatReviewDate } from "./review-item";

function Thumb({
  image,
  name,
}: {
  image: ReviewProductImage | undefined;
  name: string;
}) {
  return (
    <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
      {image ? (
        <Image
          src={image.url}
          alt={image.alt ?? name}
          fill
          sizes="56px"
          className="object-cover"
        />
      ) : (
        <span className="flex size-full items-center justify-center font-display text-lg text-muted-foreground/40">
          {name.charAt(0)}
        </span>
      )}
    </span>
  );
}

function AwaitingRow({ product }: { product: AwaitingReviewProduct }) {
  const [writing, setWriting] = useState(false);
  return (
    <li className="py-4">
      <div className="flex items-center gap-3">
        <Thumb image={product.images[0]} name={product.name} />
        <Link
          href={`/product/${product.slug}`}
          className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary"
        >
          {product.name}
        </Link>
        {writing ? null : (
          <Button
            size="sm"
            shape="rounded"
            variant="soft"
            leading={<Star aria-hidden />}
            onClick={() => setWriting(true)}
          >
            Rate it
          </Button>
        )}
      </div>
      {writing ? (
        <div className="mt-4 rounded-xl border bg-muted/20 p-4">
          <ReviewForm
            productId={product.id}
            idPrefix={`awaiting-${product.id}`}
            onSaved={() => setWriting(false)}
            onCancel={() => setWriting(false)}
          />
        </div>
      ) : null}
    </li>
  );
}

function MyReviewRow({ review }: { review: OwnReview }) {
  return (
    <li className="py-4">
      <div className="flex gap-3">
        <Thumb image={review.product.images[0]} name={review.product.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/product/${review.product.slug}#reviews`}
              className="truncate text-sm font-medium hover:text-primary"
            >
              {review.product.name}
            </Link>
            <span className="text-xs text-muted-foreground">
              {formatReviewDate(review.createdAt)}
            </span>
          </div>
          <Stars value={review.rating} size="xs" className="mt-1" />
          {review.title ? (
            <p className="mt-1.5 text-sm font-semibold">{review.title}</p>
          ) : null}
          {review.body ? (
            <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
              {review.body}
            </p>
          ) : null}
          {review.status === "REJECTED" ? (
            <p className="mt-2 inline-block rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              This review isn&apos;t shown on the store.
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

type Tab = "to-review" | "reviewed";

function TabButton({
  id,
  active,
  count,
  label,
  onSelect,
}: {
  id: Tab;
  active: boolean;
  count: number;
  label: string;
  onSelect: (tab: Tab) => void;
}) {
  return (
    <Button
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      variant="ghost"
      size="md"
      shape="square"
      onClick={() => onSelect(id)}
      className={cn(
        "-mb-px h-11 gap-2 border-b-2 px-1 hover:bg-transparent",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs tabular-nums",
          active ? "bg-primary/10 text-primary" : "bg-muted",
        )}
      >
        {count}
      </span>
    </Button>
  );
}

export function AccountReviews() {
  const awaiting = useAwaitingReviews();
  const mine = useMyReviews();
  const [chosen, setChosen] = useState<Tab | null>(null);

  if (awaiting.isPending || mine.isPending) {
    return <ListSkeleton rows={3} label="Loading your reviews" />;
  }

  const toRate = awaiting.data ?? [];
  const written = mine.data?.items ?? [];
  const writtenTotal = mine.data?.total ?? written.length;
  const tab: Tab = chosen ?? (toRate.length > 0 ? "to-review" : "reviewed");

  return (
    <div className="max-w-3xl">
      <div role="tablist" aria-label="Reviews" className="flex gap-6 border-b">
        <TabButton
          id="to-review"
          label="To review"
          count={toRate.length}
          active={tab === "to-review"}
          onSelect={setChosen}
        />
        <TabButton
          id="reviewed"
          label="Reviewed"
          count={writtenTotal}
          active={tab === "reviewed"}
          onSelect={setChosen}
        />
      </div>

      {tab === "to-review" ? (
        <section
          id="panel-to-review"
          role="tabpanel"
          aria-labelledby="tab-to-review"
          className="pt-2"
        >
          <h2 className="sr-only">Rate your purchases</h2>
          {toRate.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              You&apos;re all caught up. Delivered items you haven&apos;t
              reviewed show up here.
            </p>
          ) : (
            <ul className="divide-y">
              {toRate.map((product) => (
                <AwaitingRow key={product.id} product={product} />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section
          id="panel-reviewed"
          role="tabpanel"
          aria-labelledby="tab-reviewed"
          className="pt-2"
        >
          <h2 className="sr-only">Your reviews</h2>
          {written.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              Reviews you write appear here.
            </p>
          ) : (
            <ul className="divide-y">
              {written.map((review) => (
                <MyReviewRow key={review.id} review={review} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
