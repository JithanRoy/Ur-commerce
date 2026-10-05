"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STARS = [1, 2, 3, 4, 5] as const;

export const STAR_LABELS: Record<(typeof STARS)[number], string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

export function StarInput({
  value,
  onChange,
  label = "Your rating",
  error,
  disabled,
}: {
  value: number;
  onChange: (rating: number) => void;
  label?: string;
  error?: string | null;
  disabled?: boolean;
}) {
  const name = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value;
  const caption = STAR_LABELS[shown as keyof typeof STAR_LABELS];

  return (
    <fieldset disabled={disabled} aria-invalid={error ? true : undefined}>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div
        className="flex items-center gap-3"
        onPointerLeave={() => setHovered(null)}
      >
        <div className="flex items-center">
          {STARS.map((star) => (
            <label
              key={star}
              onPointerEnter={() => setHovered(star)}
              className="relative cursor-pointer p-0.5 has-[:focus-visible]:rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40"
            >
              <input
                type="radio"
                name={name}
                value={star}
                checked={value === star}
                onChange={() => onChange(star)}
                className="sr-only"
                aria-label={`${star} star${star === 1 ? "" : "s"}, ${STAR_LABELS[star]}`}
              />
              <Star
                aria-hidden
                strokeWidth={1.5}
                className={cn(
                  "size-7 transition-[color,transform] duration-150",
                  star <= shown
                    ? "fill-amber-500 text-amber-500"
                    : "fill-transparent text-foreground/25",
                  hovered === star && "scale-110",
                )}
              />
            </label>
          ))}
        </div>
        <span className="min-w-20 text-sm text-muted-foreground">
          {caption ?? "Tap to rate"}
        </span>
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
