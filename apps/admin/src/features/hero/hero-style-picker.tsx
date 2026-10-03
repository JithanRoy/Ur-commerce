import { useState } from "react";
import { Info, Radio as RadioIcon } from "lucide-react";
import type {
  AdminHeroSlide,
  HeroSettings,
  HeroStyle,
  UpdateHeroSettingsInput,
} from "@urcommerce/api-client";
import { useUpdateHeroSettings } from "@/api/hero";
import { Radio } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  HERO_STYLE_CHOICES,
  heroStyleTitle,
  liveHeroStyle,
  visibleSlideCount,
  type HeroStyleChoice,
} from "./hero-style";

const STYLE_SAVED_MESSAGES: Record<HeroStyle, string> = {
  CAROUSEL: "Your homepage now shows the image slideshow.",
  STATIC: "Your homepage now shows the headline hero.",
  OFF: "The homepage hero is turned off.",
};

function styleSavedMessage(
  _settings: HeroSettings,
  change: UpdateHeroSettingsInput,
): string {
  return change.heroStyle
    ? STYLE_SAVED_MESSAGES[change.heroStyle]
    : "Hero style saved.";
}

function SlideshowHint() {
  return (
    <span className="flex h-full flex-col justify-between gap-1">
      <span className="flex flex-1 gap-1">
        <span className="flex-[3] rounded-sm bg-primary/70" />
        <span className="flex-1 rounded-sm bg-primary/25" />
      </span>
      <span className="flex justify-center gap-1">
        <span className="size-1 rounded-full bg-foreground/60" />
        <span className="size-1 rounded-full bg-foreground/20" />
        <span className="size-1 rounded-full bg-foreground/20" />
      </span>
    </span>
  );
}

function HeadlineHint() {
  return (
    <span className="flex h-full flex-col justify-center gap-1">
      <span className="h-1.5 w-4/5 rounded-full bg-foreground/60" />
      <span className="h-1.5 w-3/5 rounded-full bg-foreground/60" />
      <span className="mt-1 flex gap-1">
        <span className="h-2 w-6 rounded-full bg-primary/70" />
        <span className="h-2 w-6 rounded-full border border-foreground/30" />
      </span>
    </span>
  );
}

function OffHint() {
  return (
    <span className="flex h-full flex-col gap-1">
      <span className="flex-1 rounded-sm border border-dashed border-foreground/25" />
      <span className="grid grid-cols-3 gap-1">
        <span className="h-2 rounded-sm bg-foreground/20" />
        <span className="h-2 rounded-sm bg-foreground/20" />
        <span className="h-2 rounded-sm bg-foreground/20" />
      </span>
    </span>
  );
}

function StyleHint({ style }: { style: HeroStyle }) {
  return (
    <span
      aria-hidden
      className="block h-14 w-20 shrink-0 rounded-md border bg-background p-1.5"
    >
      {style === "CAROUSEL" ? <SlideshowHint /> : null}
      {style === "STATIC" ? <HeadlineHint /> : null}
      {style === "OFF" ? <OffHint /> : null}
    </span>
  );
}

function StyleCard({
  choice,
  selected,
  live,
  disabled,
  onSelect,
}: {
  choice: HeroStyleChoice;
  selected: boolean;
  live: boolean;
  disabled: boolean;
  onSelect: (style: HeroStyle) => void;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition-colors",
        selected
          ? "border-primary ring-1 ring-primary"
          : "hover:border-foreground/30",
        disabled && "cursor-progress",
      )}
    >
      <Radio
        name="heroStyle"
        value={choice.style}
        checked={selected}
        disabled={disabled}
        onChange={() => onSelect(choice.style)}
        className="mt-0.5"
        aria-describedby={`hero-style-${choice.style}-description`}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{choice.title}</span>
          {live ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <RadioIcon className="size-3" aria-hidden />
              Live
            </span>
          ) : null}
        </span>
        <span
          id={`hero-style-${choice.style}-description`}
          className="mt-1 block text-xs text-muted-foreground"
        >
          {choice.description}
        </span>
      </span>
      <StyleHint style={choice.style} />
    </label>
  );
}

function FallbackNotice() {
  return (
    <p
      role="status"
      className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900"
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      Your homepage shows the headline hero until you add a slide.
    </p>
  );
}

export function HeroStylePicker({
  style,
  slides,
}: {
  style: HeroStyle;
  slides: AdminHeroSlide[];
}) {
  const [pending, setPending] = useState<HeroStyle>();
  const save = useUpdateHeroSettings({ success: styleSavedMessage });
  const shown = pending ?? style;
  const live = liveHeroStyle(shown, slides);
  const fallingBack = shown === "CAROUSEL" && visibleSlideCount(slides) === 0;

  const select = (next: HeroStyle) => {
    if (next === shown) return;
    setPending(next);
    save.mutate(
      { heroStyle: next },
      { onSettled: () => setPending(undefined) },
    );
  };

  return (
    <section aria-labelledby="hero-style-heading" className="mb-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="hero-style-heading" className="text-sm font-medium">
          What the top of your homepage shows
        </h2>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Live on your storefront:{" "}
          <span className="font-medium text-foreground">
            {heroStyleTitle(live)}
          </span>
          {save.isPending ? " · Saving…" : null}
        </p>
      </div>
      <div
        role="radiogroup"
        aria-labelledby="hero-style-heading"
        className="grid gap-3 md:grid-cols-3"
      >
        {HERO_STYLE_CHOICES.map((choice) => (
          <StyleCard
            key={choice.style}
            choice={choice}
            selected={shown === choice.style}
            live={live === choice.style}
            disabled={save.isPending}
            onSelect={select}
          />
        ))}
      </div>
      {fallingBack ? <FallbackNotice /> : null}
    </section>
  );
}
