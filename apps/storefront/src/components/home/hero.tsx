import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";
import type { StaticHeroContent } from "@urcommerce/api-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_HEADLINE = "Everyday pieces, made to be worn.";
const DEFAULT_SUBHEADLINE =
  "Cotton that breathes through a Dhaka summer. Cut once, properly, and built to outlast the season.";

function safeHref(href: string | null | undefined): string | null {
  if (!href) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("https://")) return href;
  return null;
}

function splitHeadline(headline: string): [string, string | null] {
  const breakAt = headline.indexOf(", ");
  if (breakAt === -1) return [headline, null];
  return [headline.slice(0, breakAt + 1), headline.slice(breakAt + 2)];
}

function HeroBadges({
  badges,
  className,
}: {
  badges: string[];
  className?: string;
}) {
  if (badges.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-x-8 gap-y-3", className)}>
      {badges.map((badge) => (
        <li
          key={badge}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <BadgeCheck className="size-4 text-primary/70" aria-hidden />
          {badge}
        </li>
      ))}
    </ul>
  );
}

export function StaticHero({
  content,
  storeName,
  tagline,
  brandsEnabled = true,
}: {
  content: StaticHeroContent | null;
  storeName: string;
  tagline?: string | null;
  brandsEnabled?: boolean;
}) {
  const [lead, accent] = splitHeadline(content?.headline ?? DEFAULT_HEADLINE);
  const primary = {
    label: content?.primaryLabel ?? "Shop the collection",
    href: safeHref(content?.primaryUrl) ?? "/shop",
  };
  const secondaryHref = safeHref(content?.secondaryUrl);
  const secondary = content
    ? content.secondaryLabel && secondaryHref
      ? { label: content.secondaryLabel, href: secondaryHref }
      : null
    : brandsEnabled
      ? { label: "Browse brands", href: "/brand" }
      : null;
  const badges = content?.badges ?? [];
  const imageUrl = content?.imageUrl ?? null;

  return (
    <section className="relative overflow-hidden border-b">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_12%_0%,var(--color-accent),transparent_60%)] opacity-40"
      />
      {imageUrl ? null : (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 top-1/2 hidden size-[32rem] -translate-y-1/2 rounded-full border border-foreground/[0.07] lg:block"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 top-1/2 hidden size-[22rem] -translate-y-1/2 rounded-full border border-foreground/[0.05] lg:block"
          />
        </>
      )}

      <div
        className={cn(
          "container-page relative py-20 sm:py-28 lg:py-32",
          imageUrl &&
            "grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]",
        )}
      >
        <div className="max-w-2xl">
          <p className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <span className="h-px w-8 bg-foreground/25" aria-hidden />
            {content?.eyebrow ?? storeName}
          </p>

          <h1 className="mt-6 text-balance font-display text-5xl font-semibold leading-[0.95] tracking-[-0.02em] sm:text-6xl lg:text-7xl">
            {lead}
            {accent ? (
              <span className="block italic text-primary">{accent}</span>
            ) : null}
          </h1>

          <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
            {content?.subheadline ?? tagline ?? DEFAULT_SUBHEADLINE}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="xl"
              shape="pill"
              trailing={
                <ArrowRight
                  className="transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              }
              className="group px-7 text-sm hover:bg-primary hover:shadow-lg hover:shadow-primary/20"
            >
              <Link href={primary.href}>{primary.label}</Link>
            </Button>
            {secondary ? (
              <Button
                asChild
                variant="outline"
                size="xl"
                shape="pill"
                className="border-foreground/15 bg-transparent px-7 text-sm shadow-none hover:border-foreground/40 hover:bg-transparent"
              >
                <Link href={secondary.href}>{secondary.label}</Link>
              </Button>
            ) : null}
          </div>

          <HeroBadges
            badges={badges}
            className="mt-12 border-t border-foreground/10 pt-6"
          />
        </div>

        {imageUrl ? (
          <div className="relative hidden aspect-4/5 overflow-hidden rounded-2xl bg-muted lg:block">
            <Image
              src={imageUrl}
              alt=""
              fill
              priority
              sizes="420px"
              className="object-cover"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
