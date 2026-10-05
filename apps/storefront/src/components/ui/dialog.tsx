"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "./button";
import { cn } from "@/lib/utils";

function useDialogBehaviour(onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose]);

  return panel;
}

export function Dialog({
  onClose,
  labelledBy,
  label,
  className,
  children,
}: {
  onClose: () => void;
  labelledBy?: string;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const panel = useDialogBehaviour(onClose);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 animate-fade-in bg-foreground/40 backdrop-blur-[2px]"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-md animate-fade-in rounded-t-2xl border bg-background p-5 shadow-xl outline-none sm:my-auto sm:rounded-2xl sm:p-6",
          className,
        )}
      >
        <IconButton
          label="Close"
          size="icon-sm"
          onClick={onClose}
          className="absolute right-3 top-3 text-muted-foreground"
        >
          <X aria-hidden />
        </IconButton>
        {children}
      </div>
    </div>,
    document.body,
  );
}
