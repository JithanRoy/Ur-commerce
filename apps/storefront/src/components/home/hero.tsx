import Link from "next/link";
import { ArrowRight, Truck, BadgeCheck, RotateCcw } from "lucide-react";

const assurances = [
  { icon: Truck, label: "Cash on delivery" },
  { icon: BadgeCheck, label: "Free over ৳2,000" },
  { icon: RotateCcw, label: "7-day exchange" },
];

export function Hero({
  storeName,
  tagline,
}: {
  storeName: string;
  tagline?: string | null;
}) {
  return (
    <section className="relative overflow-hidden border-b">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_12%_0%,var(--color-accent),transparent_60%)] opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/2 hidden size-[32rem] -translate-y-1/2 rounded-full border border-foreground/[0.07] lg:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 top-1/2 hidden size-[22rem] -translate-y-1/2 rounded-full border border-foreground/[0.05] lg:block"
      />

      <div className="container-page relative py-20 sm:py-28 lg:py-32">
        <div className="max-w-2xl">
          <p className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <span className="h-px w-8 bg-foreground/25" aria-hidden />
            {storeName}
          </p>

          <h1 className="mt-6 text-balance font-display text-5xl font-semibold leading-[0.95] tracking-[-0.02em] sm:text-6xl lg:text-7xl">
            Everyday pieces,
            <span className="block italic text-primary">made to be worn.</span>
          </h1>

          <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
            {tagline ??
              "Cotton that breathes through a Dhaka summer. Cut once, properly, and built to outlast the season."}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/shop"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition-all hover:gap-3 hover:shadow-lg hover:shadow-primary/20"
            >
              Shop the collection
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <Link
              href="/brand"
              className="inline-flex h-12 items-center rounded-full border border-foreground/15 px-7 text-sm font-medium transition-colors hover:border-foreground/40"
            >
              Browse brands
            </Link>
          </div>

          <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-foreground/10 pt-6">
            {assurances.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <item.icon className="size-4 text-primary/70" aria-hidden />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
