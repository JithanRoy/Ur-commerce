import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STARS = [1, 2, 3, 4, 5] as const;

const starSize = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
} as const;

export type StarSize = keyof typeof starSize;

function fillFor(value: number, star: number): number {
  return Math.min(Math.max(value - (star - 1), 0), 1);
}

export function Stars({
  value,
  size = "sm",
  className,
  label,
  decorative = false,
}: {
  value: number;
  size?: StarSize;
  className?: string;
  label?: string;
  decorative?: boolean;
}) {
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={
        decorative
          ? undefined
          : (label ?? `${Math.round(value * 10) / 10} out of 5 stars`)
      }
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {STARS.map((star) => {
        const fill = fillFor(value, star);
        return (
          <span key={star} className="relative inline-flex" aria-hidden>
            <Star
              className={cn(starSize[size], "text-foreground/15")}
              fill="currentColor"
              strokeWidth={0}
            />
            {fill > 0 ? (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  className={cn(starSize[size], "text-amber-500")}
                  fill="currentColor"
                  strokeWidth={0}
                />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
