"use client";

import { useLinkStatus } from "next/link";
import { createPendingSignal } from "@/lib/activity";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const catalogueNavigation = createPendingSignal();

export function LinkPendingIndicator({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  catalogueNavigation.useTrack(pending);

  if (!pending) return null;

  return (
    <span data-link-pending="" className={cn("inline-flex", className)}>
      <Spinner size="xs" />
    </span>
  );
}

export function CatalogueResults({ children }: { children: React.ReactNode }) {
  const pending = catalogueNavigation.usePending();

  return (
    <div
      aria-busy={pending || undefined}
      className={cn(
        "transition-opacity duration-200",
        pending && "pointer-events-none opacity-50",
      )}
    >
      {children}
    </div>
  );
}
