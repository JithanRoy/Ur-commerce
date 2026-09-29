"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";
import { SignInForm } from "./sign-in-form";

export function SignInDialog({
  open,
  onClose,
  onSignedIn,
  returnTo,
  title = "Sign in to continue",
  description = "You need an account to place an order. Your bag is saved either way.",
}: {
  open: boolean;
  onClose: () => void;
  onSignedIn?: () => void;
  returnTo: string;
  title?: string;
  description?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previouslyFocused = document.activeElement;
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 bg-foreground/40 backdrop-blur-[2px]"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-in-dialog-title"
        className="relative my-auto w-full max-w-sm rounded-2xl border bg-background p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>

        <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-5" aria-hidden />
        </span>

        <h2
          id="sign-in-dialog-title"
          className="mt-4 font-display text-xl font-semibold"
        >
          {title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="mt-5">
          <SignInForm autoFocus onSignedIn={() => onSignedIn?.()} />
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link
            href={`/register?returnTo=${encodeURIComponent(returnTo)}`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
