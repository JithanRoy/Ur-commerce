import { useState } from "react";
import {
  HERO_INTERVAL_MAX_MS,
  HERO_INTERVAL_MIN_MS,
} from "@urcommerce/api-client";
import type {
  HeroSettings,
  UpdateHeroSettingsInput,
} from "@urcommerce/api-client";
import { Timer } from "lucide-react";
import { useUpdateHeroSettings } from "@/api/hero";
import { SelectField } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/input";
import type { SelectOption } from "@/components/ui/input";

const INTERVAL_PRESETS_MS = [3000, 5000, 8000, 10000];

function secondsLabel(intervalMs: number): string {
  const seconds = intervalMs / 1000;
  return seconds === 1 ? "1 second" : `${seconds} seconds`;
}

function isAllowedInterval(intervalMs: number): boolean {
  return (
    intervalMs >= HERO_INTERVAL_MIN_MS && intervalMs <= HERO_INTERVAL_MAX_MS
  );
}

function intervalOptions(currentMs: number): SelectOption[] {
  const values =
    INTERVAL_PRESETS_MS.includes(currentMs) || !isAllowedInterval(currentMs)
      ? INTERVAL_PRESETS_MS
      : [...INTERVAL_PRESETS_MS, currentMs].sort((a, b) => a - b);
  return values.map((value) => ({
    value: String(value),
    label: secondsLabel(value),
  }));
}

function savedMessage(
  _settings: HeroSettings,
  change: UpdateHeroSettingsInput,
): string {
  if (change.heroAutoplay === true) return "Autoplay turned on.";
  if (change.heroAutoplay === false) return "Autoplay turned off.";
  return `Each slide now shows for ${secondsLabel(change.heroIntervalMs ?? 0)}.`;
}

function displayedSettings(
  saved: HeroSettings,
  pending: UpdateHeroSettingsInput | undefined,
): HeroSettings {
  return {
    autoplay: pending?.heroAutoplay ?? saved.autoplay,
    intervalMs: pending?.heroIntervalMs ?? saved.intervalMs,
  };
}

export function HeroSettingsCard({ settings }: { settings: HeroSettings }) {
  const [unsaved, setUnsaved] = useState<UpdateHeroSettingsInput>();
  const save = useUpdateHeroSettings({ success: savedMessage });
  const shown = displayedSettings(settings, unsaved);

  const change = (patch: UpdateHeroSettingsInput) => {
    setUnsaved((current) => ({ ...current, ...patch }));
    save.mutate(patch, { onSettled: () => setUnsaved(undefined) });
  };

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Timer className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-medium">Rotation</h2>
          <p className="text-xs text-muted-foreground">
            Changes save as you make them.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Checkbox
          id="heroAutoplay"
          label="Rotate slides automatically"
          description="When off, shoppers move between slides with the arrows."
          checked={shown.autoplay}
          onChange={(event) => change({ heroAutoplay: event.target.checked })}
        />

        <SelectField
          id="heroIntervalMs"
          label="Time on each slide"
          hint={
            shown.autoplay
              ? "Long enough to read any text in the image."
              : "Turn on autoplay to choose a timing."
          }
          options={intervalOptions(shown.intervalMs)}
          value={String(shown.intervalMs)}
          disabled={!shown.autoplay}
          onChange={(event) =>
            change({ heroIntervalMs: Number(event.target.value) })
          }
        />
      </div>
    </section>
  );
}
