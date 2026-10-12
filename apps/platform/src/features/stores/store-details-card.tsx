import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, ExternalLink, Pencil } from "lucide-react";
import {
  RESERVED_SUBDOMAINS,
  STORE_LOCALES,
  STORE_LOCALE_LABELS,
  SUBDOMAIN_MAX_LENGTH,
  SUBDOMAIN_MIN_LENGTH,
  SUBDOMAIN_PATTERN,
  isApiError,
} from "@urcommerce/api-client";
import type {
  PlatformStore,
  StoreLocale,
  UpdateStoreInput,
} from "@urcommerce/api-client";
import { useUpdateStore } from "@/api/stores";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { adminUrl, displayHost, storefrontUrl } from "@/lib/store-urls";
import { formatDateTime } from "./date";

const reserved: readonly string[] = RESERVED_SUBDOMAINS;
const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

const schema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(120),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .min(SUBDOMAIN_MIN_LENGTH, `At least ${SUBDOMAIN_MIN_LENGTH} characters`)
    .max(SUBDOMAIN_MAX_LENGTH)
    .regex(
      SUBDOMAIN_PATTERN,
      "Lowercase letters and numbers, joined by single hyphens",
    )
    .refine(
      (value) => !reserved.includes(value),
      "That name is reserved for the platform",
    ),
  customDomain: z
    .string()
    .trim()
    .toLowerCase()
    .max(253)
    .refine(
      (value) => value === "" || DOMAIN_PATTERN.test(value),
      "Enter a domain like shop.example.com, without https://",
    )
    .refine(
      (value) => !value.endsWith(".localhost"),
      "A .localhost address can't be a store's own domain",
    ),
  locale: z.enum(STORE_LOCALES),
  timezone: z.string().min(1, "Choose a time zone"),
});

type FormValues = z.infer<typeof schema>;

function isStoreLocale(value: string): value is StoreLocale {
  return STORE_LOCALES.some((locale) => locale === value);
}

function valuesFrom(store: PlatformStore): FormValues {
  return {
    name: store.name,
    subdomain: store.subdomain,
    customDomain: store.customDomain ?? "",
    locale: isStoreLocale(store.locale) ? store.locale : "en",
    timezone: store.timezone,
  };
}

function changesFrom(
  store: PlatformStore,
  values: FormValues,
): UpdateStoreInput {
  const changes: UpdateStoreInput = {};
  if (values.name !== store.name) changes.name = values.name;
  if (values.subdomain !== store.subdomain)
    changes.subdomain = values.subdomain;
  const domain = values.customDomain || null;
  if (domain !== store.customDomain) changes.customDomain = domain;
  if (values.locale !== store.locale) changes.locale = values.locale;
  if (values.timezone !== store.timezone) changes.timezone = values.timezone;
  return changes;
}

function timeZoneOptions(current: string) {
  const zones = Intl.supportedValuesOf("timeZone");
  const all = zones.includes(current) ? zones : [current, ...zones];
  return all.map((zone) => ({
    value: zone,
    label: zone.replace(/_/g, " "),
    keywords: zone,
  }));
}

const localeOptions = STORE_LOCALES.map((locale) => ({
  value: locale,
  label: STORE_LOCALE_LABELS[locale],
}));

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-all text-sm">{children}</dd>
    </div>
  );
}

function ExternalAnchor({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
    >
      {displayHost(href)}
      <ExternalLink className="size-3.5" aria-hidden />
    </a>
  );
}

function localeLabel(locale: string): string {
  return isStoreLocale(locale) ? STORE_LOCALE_LABELS[locale] : locale;
}

function DetailsView({ store }: { store: PlatformStore }) {
  return (
    <dl className="divide-y">
      <Detail label="Name">{store.name}</Detail>
      <Detail label="Subdomain">
        <span className="font-mono">{store.subdomain}</span>
      </Detail>
      <Detail label="Storefront">
        <ExternalAnchor href={storefrontUrl(store.subdomain)} />
      </Detail>
      <Detail label="Admin">
        <ExternalAnchor href={adminUrl(store.subdomain)} />
      </Detail>
      <Detail label="Own domain">{store.customDomain ?? "None"}</Detail>
      <Detail label="Language">{localeLabel(store.locale)}</Detail>
      <Detail label="Time zone">{store.timezone.replace(/_/g, " ")}</Detail>
      <Detail label="Currency">{store.currency}</Detail>
      <Detail label="Created">{formatDateTime(store.createdAt)}</Detail>
      <Detail label="Last changed">{formatDateTime(store.updatedAt)}</Detail>
      <Detail label="Store ID">
        <code className="font-mono text-xs text-muted-foreground">
          {store.id}
        </code>
      </Detail>
    </dl>
  );
}

function AddressWarning({ from, to }: { from: string; to: string }) {
  return (
    <p
      role="note"
      className="flex gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        The store moves from <strong>{displayHost(storefrontUrl(from))}</strong>{" "}
        to <strong>{displayHost(storefrontUrl(to))}</strong> as soon as you
        save. The old address stops working, so tell the owner and their
        customers.
      </span>
    </p>
  );
}

function DetailsForm({
  store,
  onDone,
}: {
  store: PlatformStore;
  onDone: () => void;
}) {
  const update = useUpdateStore(store.id);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: valuesFrom(store),
  });
  const { errors, isSubmitting } = form.formState;
  const subdomain = useWatch({ control: form.control, name: "subdomain" });
  const locale = useWatch({ control: form.control, name: "locale" });
  const timezone = useWatch({ control: form.control, name: "timezone" });
  const zones = useMemo(
    () => timeZoneOptions(store.timezone),
    [store.timezone],
  );
  const nextSubdomain = subdomain.trim().toLowerCase();
  const moving =
    nextSubdomain !== store.subdomain && SUBDOMAIN_PATTERN.test(nextSubdomain);

  async function onSubmit(values: FormValues) {
    const changes = changesFrom(store, values);
    if (Object.keys(changes).length === 0) {
      onDone();
      return;
    }
    try {
      await update.mutateAsync(changes);
      onDone();
    } catch (error) {
      if (!isApiError(error)) return;
      if (/subdomain/i.test(error.message)) {
        form.setError("subdomain", { message: error.message });
      } else if (/domain/i.test(error.message)) {
        form.setError("customDomain", { message: error.message });
      }
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="space-y-4 py-3"
    >
      <TextField
        label="Store name"
        error={errors.name?.message}
        {...form.register("name")}
      />
      <TextField
        label="Subdomain"
        autoCapitalize="none"
        spellCheck={false}
        error={errors.subdomain?.message}
        {...form.register("subdomain")}
      />
      {moving ? (
        <AddressWarning from={store.subdomain} to={nextSubdomain} />
      ) : null}
      <TextField
        label="Own domain"
        optional
        placeholder="shop.example.com"
        autoCapitalize="none"
        spellCheck={false}
        hint="Leave empty to remove it. Its DNS must point at the platform before it works."
        error={errors.customDomain?.message}
        {...form.register("customDomain")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Language"
          options={localeOptions}
          value={locale}
          onChange={(event) => {
            const value = event.target.value;
            if (isStoreLocale(value)) form.setValue("locale", value);
          }}
        />
        <SelectField
          label="Time zone"
          searchable
          searchPlaceholder="Search time zones"
          options={zones}
          value={timezone}
          error={errors.timezone?.message}
          onChange={(event) =>
            form.setValue("timezone", event.target.value, {
              shouldDirty: true,
            })
          }
        />
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" loading={isSubmitting} loadingText="Saving…">
          Save details
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function StoreDetailsCard({ store }: { store: PlatformStore }) {
  const [editing, setEditing] = useState(false);
  const closed = store.status === "CANCELLED";

  return (
    <section
      aria-labelledby="details-title"
      className="rounded-xl border bg-card px-6 py-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="details-title" className="font-semibold">
          Details
        </h2>
        {editing || closed ? null : (
          <Button
            variant="outline"
            size="sm"
            leading={<Pencil aria-hidden />}
            onClick={() => setEditing(true)}
          >
            Edit details
          </Button>
        )}
      </div>
      {editing ? (
        <DetailsForm store={store} onDone={() => setEditing(false)} />
      ) : (
        <DetailsView store={store} />
      )}
    </section>
  );
}
