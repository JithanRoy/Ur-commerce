import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@urcommerce/api-client";
import type {
  StoreSettings,
  UpdateStoreSettingsInput,
} from "@urcommerce/api-client";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import { TextField } from "@/components/ui/field";
import { ImageField } from "@/components/ui/image-field";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { ColourField } from "@/features/branding/colour-field";
import { BrandPreview } from "@/features/branding/brand-preview";

const HEX = /^#[0-9a-fA-F]{6}$/;

type ImageDraft = {
  url: string | null;
  objectKey?: string;
};

type Draft = {
  displayName: string;
  tagline: string;
  logo: ImageDraft;
  favicon: ImageDraft;
  primaryColor: string;
  accentColor: string;
  supportEmail: string;
  supportPhone: string;
};

function toDraft(settings: StoreSettings): Draft {
  return {
    displayName: settings.storeName,
    tagline: settings.tagline ?? "",
    logo: { url: settings.logoUrl },
    favicon: { url: settings.faviconUrl },
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

function imagePatch(
  image: ImageDraft,
  savedUrl: string | null,
): { objectKey?: string; url?: null } {
  if (image.objectKey) return { objectKey: image.objectKey };
  if (image.url === null && savedUrl !== null) return { url: null };
  return {};
}

function buildPatch(
  draft: Draft,
  saved: StoreSettings,
): UpdateStoreSettingsInput {
  const logo = imagePatch(draft.logo, saved.logoUrl);
  const favicon = imagePatch(draft.favicon, saved.faviconUrl);
  return {
    displayName: draft.displayName.trim(),
    tagline: optional(draft.tagline),
    ...(logo.objectKey ? { logoObjectKey: logo.objectKey } : {}),
    ...(logo.url === null ? { logoUrl: null } : {}),
    ...(favicon.objectKey ? { faviconObjectKey: favicon.objectKey } : {}),
    ...(favicon.url === null ? { faviconUrl: null } : {}),
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
  return null;
}

export function BrandingRoute() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    data,
    isPending,
    error: loadError,
  } = useQuery({
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
      toast.success("Branding saved. Your storefront is updated.");
      setDraft(toDraft(updated));
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (cause) => {
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
            save.mutate(buildPatch(draft, data));
          }}
          className="space-y-6"
          noValidate
        >
          <section className="space-y-4">
            <h2 className="text-sm font-medium">Identity</h2>

            <TextField
              id="displayName"
              label="Store name"
              value={draft.displayName}
              onChange={(event) => set("displayName", event.target.value)}
            />

            <TextField
              id="tagline"
              label="Tagline"
              hint="Shown under the headline on your homepage."
              value={draft.tagline}
              onChange={(event) => set("tagline", event.target.value)}
              placeholder="Everyday wear, made in Bangladesh"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <ImageField
                scope="store"
                label="logo"
                hint="Replaces the store name in the header."
                fit="contain"
                currentUrl={draft.logo.url}
                disabled={save.isPending}
                onUploaded={(objectKey, previewUrl) =>
                  set("logo", { url: previewUrl, objectKey })
                }
                onCleared={() => set("logo", { url: null })}
              />
              <ImageField
                scope="store"
                label="favicon"
                hint="Square, 64×64 or larger."
                fit="contain"
                currentUrl={draft.favicon.url}
                disabled={save.isPending}
                onUploaded={(objectKey, previewUrl) =>
                  set("favicon", { url: previewUrl, objectKey })
                }
                onCleared={() => set("favicon", { url: null })}
              />
            </div>
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
            <TextField
              id="supportEmail"
              label="Email"
              hint="Shown in the storefront footer. Leave blank to hide."
              type="email"
              value={draft.supportEmail}
              onChange={(event) => set("supportEmail", event.target.value)}
            />
            <TextField
              id="supportPhone"
              label="Phone"
              value={draft.supportPhone}
              onChange={(event) => set("supportPhone", event.target.value)}
            />
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

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={Boolean(problem)}
              loading={save.isPending}
              loadingText="Saving…"
              className="px-5"
            >
              Save branding
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDraft(toDraft(data));
                setError(null);
              }}
              className="px-5"
            >
              Reset
            </Button>
          </div>
        </form>

        <BrandPreview
          storeName={draft.displayName || "Your store"}
          tagline={draft.tagline}
          logoUrl={draft.logo.url ?? ""}
          primaryColor={
            HEX.test(draft.primaryColor) ? draft.primaryColor : "#000000"
          }
          accentColor={
            HEX.test(draft.accentColor) ? draft.accentColor : "#EEEEEE"
          }
        />
      </div>
    </div>
  );
}
