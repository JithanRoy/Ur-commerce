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
import {
  useAwaitingReviews,
  useDeleteReview,
  useMyReviews,
} from "@/api/reviews";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/page-skeletons";
import { Stars } from "@/components/ui/stars";
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
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteReview();

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
          {editing ? null : (
            <>
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
              {confirming ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
                  <p className="mr-auto text-sm">Delete this review?</p>
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
                <div className="mt-3 flex gap-2">
                  <Button
                    size="xs"
                    shape="rounded"
                    variant="outline"
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="xs"
                    shape="rounded"
                    variant="destructive-ghost"
                    onClick={() => setConfirming(true)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {editing ? (
        <div className="mt-4 rounded-xl border bg-muted/20 p-4">
          <ReviewForm
            productId={review.productId}
            existing={review}
            idPrefix={`edit-${review.id}`}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : null}
    </li>
  );
}

export function AccountReviews() {
  const awaiting = useAwaitingReviews();
  const mine = useMyReviews();

  if (awaiting.isPending || mine.isPending) {
    return <ListSkeleton rows={3} label="Loading your reviews" />;
  }

  const toRate = awaiting.data ?? [];
  const written = mine.data?.items ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section
        aria-labelledby="awaiting-heading"
        className="rounded-xl border bg-card p-5"
      >
        <h2 id="awaiting-heading" className="font-medium">
          Rate your purchases
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Delivered items you haven&apos;t reviewed yet.
        </p>
        {toRate.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        ) : (
          <ul className="mt-2 divide-y">
            {toRate.map((product) => (
              <AwaitingRow key={product.id} product={product} />
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="mine-heading"
        className="rounded-xl border bg-card p-5"
      >
        <h2 id="mine-heading" className="font-medium">
          Your reviews
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {written.length === 0
            ? "Reviews you write appear here."
            : `${mine.data?.total ?? written.length} review${(mine.data?.total ?? 0) === 1 ? "" : "s"}`}
        </p>
        {written.length === 0 ? null : (
          <ul className="mt-2 divide-y">
            {written.map((review) => (
              <MyReviewRow key={review.id} review={review} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
