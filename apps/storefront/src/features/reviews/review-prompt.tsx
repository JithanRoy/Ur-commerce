"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Star, X } from "lucide-react";
import type { ReviewPrompt as Prompt } from "@urcommerce/api-client";
import {
  useDismissPrompt,
  useMarkPromptShown,
  useReviewPrompt,
} from "@/api/reviews";
import { queryKeys } from "@/api/query-keys";
import { Button, IconButton } from "@/components/ui/button";
import { useAuth } from "@/stores/auth";

const ReviewDialog = dynamic(() =>
  import("./review-dialog").then((module) => module.ReviewDialog),
);

const QUIET_PATHS = [
  "/cart",
  "/checkout",
  "/login",
  "/register",
  "/account/reviews",
];

function isQuietPath(pathname: string): boolean {
  return QUIET_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function PromptCard({
  prompt,
  onReview,
  onLater,
  onNever,
}: {
  prompt: Prompt;
  onReview: () => void;
  onLater: () => void;
  onNever: () => void;
}) {
  const image = prompt.product.images[0];

  return (
    <aside
      aria-label="Review your purchase"
      className="fixed inset-x-4 bottom-4 z-40 animate-fade-in rounded-2xl border bg-background p-4 shadow-xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-96"
    >
      <IconButton
        label="Not now"
        size="icon-xs"
        onClick={onLater}
        className="absolute right-2 top-2 text-muted-foreground"
      >
        <X aria-hidden />
      </IconButton>
      <div className="flex gap-3 pr-6">
        <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
          {image ? (
            <Image
              src={image.url}
              alt={image.alt ?? prompt.product.name}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center font-display text-lg text-muted-foreground/40">
              {prompt.product.name.charAt(0)}
            </span>
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">How did it turn out?</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            Rate your {prompt.product.name} from order{" "}
            {prompt.order.orderNumber}.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          shape="rounded"
          leading={<Star aria-hidden />}
          onClick={onReview}
        >
          Write a review
        </Button>
        <Button size="sm" shape="rounded" variant="ghost" onClick={onLater}>
          Not now
        </Button>
        <Button
          size="sm"
          shape="rounded"
          variant="link"
          className="ml-auto text-xs text-muted-foreground"
          onClick={onNever}
        >
          Don&apos;t ask again
        </Button>
      </div>
    </aside>
  );
}

export function ReviewPrompt() {
  const pathname = usePathname();
  const signedIn = useAuth((state) => Boolean(state.session));
  const queryClient = useQueryClient();
  const { data: prompt } = useReviewPrompt(signedIn);
  const { mutate: recordShown } = useMarkPromptShown();
  const dismiss = useDismissPrompt();
  const [state, setState] = useState<"card" | "writing" | "closed">("card");
  const recorded = useRef<string | null>(null);
  const quiet =
    isQuietPath(pathname) ||
    (prompt ? pathname === `/product/${prompt.product.slug}` : false);
  const productId = prompt?.product.id ?? null;
  const visible = Boolean(prompt) && !quiet && state === "card";

  useEffect(() => {
    if (!visible || !productId || recorded.current === productId) return;
    recorded.current = productId;
    recordShown(productId);
  }, [visible, productId, recordShown]);

  if (!prompt || state === "closed") return null;

  const finish = () => {
    setState("closed");
    queryClient.setQueryData(queryKeys.reviews.prompt(), null);
  };

  if (state === "writing") {
    return (
      <ReviewDialog
        productId={prompt.product.id}
        productName={prompt.product.name}
        onClose={finish}
      />
    );
  }

  if (quiet) return null;

  return (
    <PromptCard
      prompt={prompt}
      onReview={() => setState("writing")}
      onLater={finish}
      onNever={() => {
        dismiss.mutate(prompt.product.id);
        finish();
      }}
    />
  );
}
