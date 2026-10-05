"use client";

import { useState } from "react";
import {
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_TITLE_MAX_LENGTH,
} from "@urcommerce/api-client";
import type { OwnReview, UpdateReviewInput } from "@urcommerce/api-client";
import { useCreateReview, useUpdateReview } from "@/api/reviews";
import { apiErrorMessage } from "@/api/use-api-mutation";
import { Button } from "@/components/ui/button";
import { TextField, TextareaField } from "@/components/ui/field";
import { StarInput } from "@/components/ui/star-input";

type Draft = { rating: number; title: string; body: string };

function draftOf(review: OwnReview | null): Draft {
  return {
    rating: review?.rating ?? 0,
    title: review?.title ?? "",
    body: review?.body ?? "",
  };
}

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function changesFrom(review: OwnReview, draft: Draft): UpdateReviewInput {
  const changes: UpdateReviewInput = {};
  if (draft.rating !== review.rating) changes.rating = draft.rating;
  if (orNull(draft.title) !== review.title) changes.title = orNull(draft.title);
  if (orNull(draft.body) !== review.body) changes.body = orNull(draft.body);
  return changes;
}

export function ReviewForm({
  productId,
  existing = null,
  onSaved,
  onCancel,
  idPrefix = "review",
}: {
  productId: string;
  existing?: OwnReview | null;
  onSaved: (review: OwnReview) => void;
  onCancel?: () => void;
  idPrefix?: string;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(existing));
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const create = useCreateReview();
  const update = useUpdateReview();
  const pending = create.isPending || update.isPending;

  const set = <K extends keyof Draft>(field: K, value: Draft[K]) => {
    setFailure(null);
    setDraft((current) => ({ ...current, [field]: value }));
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (draft.rating < 1) {
      setRatingError("Choose from 1 to 5 stars.");
      return;
    }
    setRatingError(null);
    try {
      if (existing) {
        const changes = changesFrom(existing, draft);
        if (Object.keys(changes).length === 0) {
          onCancel?.();
          return;
        }
        onSaved(await update.mutateAsync({ id: existing.id, input: changes }));
        return;
      }
      onSaved(
        await create.mutateAsync({
          productId,
          rating: draft.rating,
          title: orNull(draft.title),
          body: orNull(draft.body),
        }),
      );
    } catch (cause) {
      setFailure(apiErrorMessage(cause, "Could not save your review."));
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <StarInput
        value={draft.rating}
        onChange={(rating) => {
          setRatingError(null);
          set("rating", rating);
        }}
        error={ratingError}
        disabled={pending}
      />
      <TextField
        id={`${idPrefix}-title`}
        label="Headline"
        optional
        maxLength={REVIEW_TITLE_MAX_LENGTH}
        placeholder="Sum it up in a few words"
        value={draft.title}
        onChange={(event) => set("title", event.target.value)}
        disabled={pending}
      />
      <TextareaField
        id={`${idPrefix}-body`}
        label="Your review"
        optional
        autoResize
        maxLength={REVIEW_BODY_MAX_LENGTH}
        placeholder="Fit, fabric, how it washed — what would help the next shopper?"
        hint={`${draft.body.length} / ${REVIEW_BODY_MAX_LENGTH}`}
        value={draft.body}
        onChange={(event) => set("body", event.target.value)}
        disabled={pending}
      />
      {failure ? (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="md"
          shape="rounded"
          loading={pending}
          loadingText={existing ? "Saving…" : "Posting…"}
        >
          {existing ? "Save changes" : "Post review"}
        </Button>
        {onCancel ? (
          <Button
            size="md"
            shape="rounded"
            variant="ghost"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
