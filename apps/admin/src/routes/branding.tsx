import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@urcommerce/api-client";
import type {
  StoreSettings,
  UpdateStoreSettingsInput,
} from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { ColourField } from "@/features/branding/colour-field";
import { BrandPreview } from "@/features/branding/brand-preview";

const HEX = /^#[0-9a-fA-F]{6}$/;

type Draft = {
  displayName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  supportEmail: string;
  supportPhone: string;
};

function toDraft(settings: StoreSettings): Draft {
  return {
    displayName: settings.storeName,
    tagline: settings.tagline ?? "",
    logoUrl: settings.logoUrl ?? "",
    faviconUrl: settings.faviconUrl ?? "",
    primaryColor: settings.theme.primaryColor,
    accentColor: settings.theme.accentColor,
    supportEmail: settings.supportEmail ?? "",
    supportPhone: settings.supportPhone ?? "",
  };
}

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function buildPatch(draft: Draft): UpdateStoreSettingsInput {
  return {
    displayName: draft.displayName.trim(),
    tagline: optional(draft.tagline),
    logoUrl: optional(draft.logoUrl),
    faviconUrl: optional(draft.faviconUrl),
    primaryColor: draft.primaryColor.toUpperCase(),
    accentColor: draft.accentColor.toUpperCase(),
    supportEmail: optional(draft.supportEmail),
    supportPhone: optional(draft.supportPhone),
  };
}

function localProblem(draft: Draft): string | null {
  if (draft.displayName.trim().length < 2) {
    return "The store name needs at least 2 characters.";
  }
  if (!HEX.test(draft.primaryColor) || !HEX.test(draft.accentColor)) {
    return "Colours must be a six-digit hex value such as #0F766E.";
  }
  const https = (value: string) =>
    value.trim() === "" || value.trim().startsWith("https://");
  if (!https(draft.logoUrl) || !https(draft.faviconUrl)) {
    return "Image links must start with https://";
  }
  return null;
}

const inputClass =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none transition-shadow focus-visible:border-foreground/30 focus-visible:ring-4 focus-visible:ring-foreground/5";

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function BrandingRoute() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isPending, error: loadError } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => adminApi.settings.get(),
    retry: false,
  });

  useEffect(() => {
    if (data) setDraft(toDraft(data));
  }, [data]);

  const save = useMutation({
    mutationFn: (patch: UpdateStoreSettingsInput) =>
      adminApi.settings.update(patch),
    onSuccess: (updated) => {
      setError(null);
      setMessage("Branding saved. Your storefront is updated.");
      setDraft(toDraft(updated));
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (cause) => {
      setMessage(null);
      setError(
        isApiError(cause) ? cause.message : "Could not save your branding.",
      );
    },
  });

  if (isPending) return <LoadingState />;
  if (loadError || !data) {
    return <ErrorState message="We could not load your store settings." />;
  }
  if (!draft) return <LoadingState />;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setMessage(null);
  };

  const problem = localProblem(draft);

  return (
    <div>
      <PageHeader
        title="Branding"
        description="Your store's name, colours and contact details. These appear on the storefront."
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (localProblem(draft)) return;
            save.mutate(buildPatch(draft));
          }}
          className="space-y-6"
          noValidate
        >
          <section className="space-y-4">
            <h2 className="text-sm font-medium">Identity</h2>

            <Field id="displayName" label="Store name">
              <input
                id="displayName"
                value={draft.displayName}
                onChange={(event) => set("displayName", event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field
              id="tagline"
              label="Tagline"
              hint="Shown under the headline on your homepage."
            >
              <input
                id="tagline"
                value={draft.tagline}
                onChange={(event) => set("tagline", event.target.value)}
                placeholder="Everyday wear, made in Bangladesh"
                className={inputClass}
              />
            </Field>

            <Field
              id="logoUrl"
              label="Logo URL"
              hint="Replaces the store name in the header. Must be https."
            >
              <input
                id="logoUrl"
                value={draft.logoUrl}
                onChange={(event) => set("logoUrl", event.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
            </Field>

            <Field id="faviconUrl" label="Favicon URL" hint="Must be https.">
              <input
                id="faviconUrl"
                value={draft.faviconUrl}
                onChange={(event) => set("faviconUrl", event.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
            </Field>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-medium">Colours</h2>
            <ColourField
              id="primaryColor"
              label="Primary"
              hint="Buttons, links and headings."
              value={draft.primaryColor}
              onChange={(value) => set("primaryColor", value)}
            />
            <ColourField
              id="accentColor"
              label="Accent"
              hint="Highlights and background washes."
              value={draft.accentColor}
              onChange={(value) => set("accentColor", value)}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-medium">Support</h2>
            <Field
              id="supportEmail"
              label="Email"
              hint="Shown in the storefront footer. Leave blank to hide."
            >
              <input
                id="supportEmail"
                type="email"
                value={draft.supportEmail}
                onChange={(event) => set("supportEmail", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field id="supportPhone" label="Phone">
              <input
                id="supportPhone"
                value={draft.supportPhone}
                onChange={(event) => set("supportPhone", event.target.value)}
                className={inputClass}
              />
            </Field>
          </section>

          {problem ? (
            <p role="alert" className="text-sm text-destructive">
              {problem}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-success">{message}</p>
          ) : null}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={save.isPending || Boolean(problem)}
              className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {save.isPending ? "Saving…" : "Save branding"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(toDraft(data));
                setError(null);
                setMessage(null);
              }}
              className="h-10 rounded-md border border-input px-5 text-sm font-medium"
            >
              Reset
            </button>
          </div>
        </form>

        <BrandPreview
          storeName={draft.displayName || "Your store"}
          tagline={draft.tagline}
          logoUrl={draft.logoUrl}
          primaryColor={HEX.test(draft.primaryColor) ? draft.primaryColor : "#000000"}
          accentColor={HEX.test(draft.accentColor) ? draft.accentColor : "#EEEEEE"}
        />
      </div>
    </div>
  );
}
