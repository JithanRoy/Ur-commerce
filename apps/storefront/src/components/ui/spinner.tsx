"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const spinnerSize = {
  xs: "size-3.5",
  sm: "size-4",
  md: "size-5",
  lg: "size-8",
} as const;

export function Spinner({
  size = "sm",
  label,
  className,
}: {
  size?: keyof typeof spinnerSize;
  label?: string;
  className?: string;
}) {
  return (
    <span
      role={label ? "status" : undefined}
      className="inline-flex items-center"
    >
      <Loader2
        aria-hidden
        className={cn(
          "animate-spin text-current motion-reduce:animate-[spin_2.4s_linear_infinite]",
          spinnerSize[size],
          className,
        )}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
