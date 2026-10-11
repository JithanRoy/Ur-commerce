import * as React from "react";
import { useDelayedFlag } from "@/lib/activity";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      {...props}
      aria-hidden
      data-slot="skeleton"
      className={cn(
        "relative isolate overflow-hidden rounded-md bg-foreground/[0.07]",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-linear-to-r after:from-transparent after:via-background/60 after:to-transparent motion-reduce:after:hidden",
        className,
      )}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
  lineClassName,
}: {
  lines?: number;
  className?: string;
  lineClassName?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-3.5",
            index === lines - 1 && lines > 1 ? "w-3/5" : "w-full",
            lineClassName,
          )}
        />
      ))}
    </div>
  );
}

export function SlowNotice({
  after = 6000,
  message = "This is taking longer than usual. Check your connection if it keeps going.",
  className,
}: {
  after?: number;
  message?: string;
  className?: string;
}) {
  const slow = useDelayedFlag(true, after);
  if (!slow) return null;
  return (
    <p
      className={cn(
        "animate-fade-in text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {message}
    </p>
  );
}

export function LoadingRegion({
  label = "Loading",
  slowAfter,
  className,
  children,
}: {
  label?: string;
  slowAfter?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy
      data-slot="loading"
      className={cn("animate-fade-in", className)}
    >
      <span className="sr-only">{label}…</span>
      {children}
      <SlowNotice after={slowAfter} className="mt-6" />
    </div>
  );
}
