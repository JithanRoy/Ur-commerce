"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function TextField({
  label,
  error,
  id,
  className,
  children,
  ...props
}: React.ComponentProps<"input"> & {
  label: string;
  error?: string;
  children?: React.ReactNode;
}) {
  const generated = React.useId();
  const fieldId = id ?? generated;
  const errorId = `${fieldId}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-medium">
        {label}
      </label>

      {children ? (
        React.isValidElement(children) ? (
          React.cloneElement(
            children as React.ReactElement<Record<string, unknown>>,
            {
              id: fieldId,
              "aria-invalid": Boolean(error),
              "aria-describedby": error ? errorId : undefined,
            },
          )
        ) : (
          children
        )
      ) : (
        <input
          {...props}
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-11 w-full rounded-lg border border-input bg-transparent px-3.5 text-sm outline-none transition-shadow placeholder:text-muted-foreground/60",
            "focus-visible:border-foreground/30 focus-visible:ring-4 focus-visible:ring-foreground/5",
            "aria-invalid:border-destructive/60 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        />
      )}

      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
