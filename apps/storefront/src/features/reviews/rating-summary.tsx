import type {
  RatingSummary as Summary,
  StarRating,
} from "@urcommerce/api-client";
import { roundedRating } from "@urcommerce/api-client";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/ui/stars";
import { cn } from "@/lib/utils";

const BARS: StarRating[] = [5, 4, 3, 2, 1];

function reviewsLabel(count: number): string {
  return `${count} review${count === 1 ? "" : "s"}`;
}

export function RatingSummary({
  summary,
  activeRating,
  onFilter,
}: {
  summary: Summary;
  activeRating: number | null;
  onFilter: (rating: number | null) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <p className="font-display text-5xl font-semibold tabular-nums">
          {roundedRating(summary.average).toFixed(1)}
        </p>
        <div>
          <Stars value={summary.average} size="md" />
          <p className="mt-1 text-sm text-muted-foreground">
            {reviewsLabel(summary.count)}
          </p>
        </div>
      </div>

      <ul className="space-y-1.5" aria-label="Filter by rating">
        {BARS.map((star) => {
          const count = summary.distribution[`${star}`];
          const share = summary.count > 0 ? count / summary.count : 0;
          const active = activeRating === star;
          return (
            <li key={star}>
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                aria-pressed={active}
                disabled={count === 0}
                onClick={() => onFilter(active ? null : star)}
                className={cn(
                  "h-auto justify-start gap-3 px-1.5 py-1 font-normal disabled:opacity-100",
                  active && "bg-muted",
                )}
              >
                <span className="w-12 shrink-0 text-left tabular-nums text-muted-foreground">
                  {star} star
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10">
                  <span
                    className="block h-full rounded-full bg-amber-500 transition-[width] duration-500"
                    style={{ width: `${share * 100}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
                  {count}
                </span>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
