"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FileTrigger({
  accept,
  multiple = false,
  disabled = false,
  label,
  onFiles,
  className,
  children,
}: {
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  label: string;
  onFiles: (files: File[]) => void;
  className?: string;
  children: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <label
      aria-disabled={disabled || undefined}
      className={cn(
        "cursor-pointer focus-within:ring-4 focus-within:ring-ring/30 aria-disabled:pointer-events-none aria-disabled:opacity-50",
        className,
      )}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-label={label}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (input.current) input.current.value = "";
          if (files.length > 0) onFiles(files);
        }}
      />
      {children}
    </label>
  );
}
