import { useEffect } from "react";
import { useFieldArray, useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router";
import { ArrowDown, ArrowUp, Plus, Type, X } from "lucide-react";
import {
  HERO_BADGE_MAX_LENGTH,
  HERO_BUTTON_LABEL_MAX_LENGTH,
  HERO_HEADLINE_MAX_LENGTH,
  HERO_MAX_BADGES,
} from "@urcommerce/api-client";
import type {
  HeroStyle,
  StaticHeroContent,
  UpdateHeroSettingsInput,
} from "@urcommerce/api-client";
import { useUpdateHeroSettings } from "@/api/hero";
import { Button, IconButton } from "@/components/ui/button";
import { Field, TextField } from "@/components/ui/field";
import { ImageField } from "@/components/ui/image-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const LINK_MAX_LENGTH = 500;
const LINK_RULE =
  "Start with / for a page in your shop (like /shop) or https:// for another site.";

function isAllowedLink(value: string): boolean {
  const pagePath = value.startsWith("/") && !value.startsWith("//");
  return pagePath || value.startsWith("https://");
}

const linkSchema = z
  .string()
  .trim()
  .max(LINK_MAX_LENGTH, `Keep links under ${LINK_MAX_LENGTH} characters.`)
  .refine((value) => value === "" || isAllowedLink(value), LINK_RULE);

const labelSchema = z
  .string()
  .trim()
  .max(
    HERO_BUTTON_LABEL_MAX_LENGTH,
    `Keep button text to ${HERO_BUTTON_LABEL_MAX_LENGTH} characters.`,
  );

const schema = z
  .object({
    headline: z
      .string()
      .trim()
      .min(1, "Write a headline for your hero.")
      .max(
        HERO_HEADLINE_MAX_LENGTH,
        `Keep the headline to ${HERO_HEADLINE_MAX_LENGTH} characters.`,
      ),
    primaryLabel: labelSchema,
    primaryUrl: linkSchema,
    secondaryLabel: labelSchema,
    secondaryUrl: linkSchema,
    badges: z
      .array(
        z.object({
          text: z
            .string()
            .trim()
            .min(1, "Write the badge or remove it.")
            .max(
              HERO_BADGE_MAX_LENGTH,
              `Keep badges to ${HERO_BADGE_MAX_LENGTH} characters.`,
            ),
        }),
      )
      .max(HERO_MAX_BADGES, `Up to ${HERO_MAX_BADGES} badges.`),
    image: z.object({
      url: z.string().nullable(),
      objectKey: z.string().optional(),
    }),
  })
  .superRefine((values, ctx) => {
    requireButtonPair(values.primaryLabel, values.primaryUrl, "primary", ctx);
    requireButtonPair(
      values.secondaryLabel,
      values.secondaryUrl,
      "secondary",
      ctx,
    );
  });

type StaticHeroValues = z.infer<typeof schema>;
type ButtonSlot = "primary" | "secondary";

function requireButtonPair(
  label: string,
  url: string,
  slot: ButtonSlot,
  ctx: z.RefinementCtx,
) {
  if (label !== "" && url === "") {
    ctx.addIssue({
      code: "custom",
      path: [`${slot}Url`],
      message: "Add the page this button opens.",
    });
  }
  if (url !== "" && label === "") {
    ctx.addIssue({
      code: "custom",
      path: [`${slot}Label`],
      message: "Add the text shown on this button.",
    });
  }
}

function toValues(content: StaticHeroContent): StaticHeroValues {
  return {
    headline: content.headline ?? "",
    primaryLabel: content.primaryLabel ?? "",
    primaryUrl: content.primaryUrl ?? "",
    secondaryLabel: content.secondaryLabel ?? "",
    secondaryUrl: content.secondaryUrl ?? "",
    badges: content.badges.map((text) => ({ text })),
    image: { url: content.imageUrl },
  };
}

function orNull(value: string): string | null {
  return value === "" ? null : value;
}

function imagePatch(
  image: StaticHeroValues["image"],
  savedUrl: string | null,
): Pick<UpdateHeroSettingsInput, "heroImageObjectKey" | "heroImageUrl"> {
  if (image.objectKey) return { heroImageObjectKey: image.objectKey };
  if (image.url === null && savedUrl !== null) return { heroImageUrl: null };
  return {};
}

function buildPatch(
  values: StaticHeroValues,
  saved: StaticHeroContent,
): UpdateHeroSettingsInput {
  return {
    heroHeadline: values.headline,
    heroPrimaryLabel: orNull(values.primaryLabel),
    heroPrimaryUrl: orNull(values.primaryUrl),
    heroSecondaryLabel: orNull(values.secondaryLabel),
    heroSecondaryUrl: orNull(values.secondaryUrl),
    heroBadges: values.badges.map((badge) => badge.text),
    ...imagePatch(values.image, saved.imageUrl),
  };
}

function editorIntro(style: HeroStyle, live: HeroStyle): string {
  if (live === "STATIC" && style === "STATIC") {
    return "This is what the top of your homepage shows now.";
  }
  if (live === "STATIC") {
    return "Showing now, because no slide is active. It steps aside once you add one.";
  }
  if (style === "CAROUSEL") {
    return "Shown instead of the slideshow whenever no slide is active.";
  }
  return "Not shown while your hero is off. Your text is kept for later.";
}

function BrandingLine({
  label,
  value,
  emptyText,
}: {
  label: string;
  value: string | null;
  emptyText: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "truncate text-sm",
          !value && "italic text-muted-foreground",
        )}
      >
        {value ?? emptyText}
      </dd>
    </div>
  );
}

function BrandingLines({ content }: { content: StaticHeroContent }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium">From your Branding</p>
        <Button asChild variant="link" size="xs" className="h-auto p-0">
          <Link to="/branding">Edit in Branding</Link>
        </Button>
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        <BrandingLine
          label="Small line above the headline (store name)"
          value={content.eyebrow}
          emptyText="Not set"
        />
        <BrandingLine
          label="Line under the headline (tagline)"
          value={content.subheadline}
          emptyText="No tagline yet"
        />
      </dl>
    </div>
  );
}

function ButtonFields({
  form,
  slot,
  title,
  labelPlaceholder,
  urlPlaceholder,
}: {
  form: UseFormReturn<StaticHeroValues>;
  slot: ButtonSlot;
  title: string;
  labelPlaceholder: string;
  urlPlaceholder: string;
}) {
  const { errors } = form.formState;
  const labelName = slot === "primary" ? "primaryLabel" : "secondaryLabel";
  const urlName = slot === "primary" ? "primaryUrl" : "secondaryUrl";

  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="mb-2 text-sm font-medium">{title}</legend>
      <TextField
        id={`hero-${labelName}`}
        label="Button text"
        optional
        maxLength={HERO_BUTTON_LABEL_MAX_LENGTH}
        placeholder={labelPlaceholder}
        error={errors[labelName]?.message}
        {...form.register(labelName)}
      />
      <TextField
        id={`hero-${urlName}`}
        label="Opens"
        optional
        maxLength={LINK_MAX_LENGTH}
        placeholder={urlPlaceholder}
        error={errors[urlName]?.message}
        {...form.register(urlName)}
      />
    </fieldset>
  );
}

function BadgeEditor({ form }: { form: UseFormReturn<StaticHeroValues> }) {
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "badges",
  });
  const badgeErrors = form.formState.errors.badges;
  const full = fields.length >= HERO_MAX_BADGES;

  return (
    <Field
      label="Badges"
      optional
      hint={`Short reassurances under the buttons, up to ${HERO_MAX_BADGES}. For example “Cash on delivery”.`}
      error={badgeErrors?.message ?? badgeErrors?.root?.message}
    >
      <div className="space-y-2">
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No badges yet.</p>
        ) : null}
        <ol className="space-y-2" aria-label="Badges in display order">
          {fields.map((field, index) => {
            const error = badgeErrors?.[index]?.text?.message;
            return (
              <li key={field.id}>
                <div className="flex items-center gap-1">
                  <Input
                    aria-label={`Badge ${index + 1}`}
                    maxLength={HERO_BADGE_MAX_LENGTH}
                    invalid={Boolean(error)}
                    containerClassName="flex-1"
                    {...form.register(`badges.${index}.text`)}
                  />
                  <IconButton
                    label={`Move badge ${index + 1} up`}
                    size="icon-sm"
                    variant="ghost"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    <ArrowUp aria-hidden />
                  </IconButton>
                  <IconButton
                    label={`Move badge ${index + 1} down`}
                    size="icon-sm"
                    variant="ghost"
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    <ArrowDown aria-hidden />
                  </IconButton>
                  <IconButton
                    label={`Remove badge ${index + 1}`}
                    size="icon-sm"
                    variant="destructive-ghost"
                    onClick={() => remove(index)}
                  >
                    <X aria-hidden />
                  </IconButton>
                </div>
                {error ? (
                  <p role="alert" className="mt-1 text-xs text-destructive">
                    {error}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
        <Button
          variant="outline"
          size="sm"
          leading={<Plus aria-hidden />}
          disabled={full}
          onClick={() => append({ text: "" }, { shouldFocus: true })}
        >
          {full ? `Maximum of ${HERO_MAX_BADGES} badges` : "Add badge"}
        </Button>
      </div>
    </Field>
  );
}

function ArtworkField({ form }: { form: UseFormReturn<StaticHeroValues> }) {
  const image = form.watch("image");

  return (
    <ImageField
      scope="store"
      label="artwork"
      currentUrl={image.url}
      hint="Optional picture beside the headline. Square or portrait works best."
      onUploaded={(objectKey, previewUrl) =>
        form.setValue(
          "image",
          { url: previewUrl, objectKey },
          { shouldDirty: true },
        )
      }
      onCleared={() =>
        form.setValue("image", { url: null }, { shouldDirty: true })
      }
    />
  );
}

export function HeroStaticEditor({
  content,
  style,
  live,
}: {
  content: StaticHeroContent;
  style: HeroStyle;
  live: HeroStyle;
}) {
  const form = useForm<StaticHeroValues>({
    resolver: zodResolver(schema),
    defaultValues: toValues(content),
  });
  const { isDirty } = form.formState;

  useEffect(() => {
    if (!form.formState.isDirty) form.reset(toValues(content));
  }, [content, form]);

  const save = useUpdateHeroSettings({
    success: "Headline hero saved.",
    onSuccess: (settings) => form.reset(toValues(settings.static)),
  });

  const submit = form.handleSubmit((values) =>
    save.mutate(buildPatch(values, content)),
  );

  const showing = live === "STATIC";

  return (
    <section
      aria-labelledby="hero-static-heading"
      className={cn(
        "rounded-xl border bg-card p-5",
        showing && "border-primary/40",
      )}
    >
      <div className="mb-4 flex items-start gap-2.5">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Type className="size-4" aria-hidden />
        </span>
        <div>
          <h2 id="hero-static-heading" className="text-sm font-medium">
            {style === "CAROUSEL" ? "Fallback headline hero" : "Headline hero"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {editorIntro(style, live)}
          </p>
        </div>
      </div>

      <form noValidate onSubmit={submit} className="space-y-5">
        <BrandingLines content={content} />

        <TextField
          id="hero-headline"
          label="Headline"
          required
          maxLength={HERO_HEADLINE_MAX_LENGTH}
          placeholder="e.g. Everyday pieces, made to be worn."
          error={form.formState.errors.headline?.message}
          {...form.register("headline")}
        />

        <ButtonFields
          form={form}
          slot="primary"
          title="Main button"
          labelPlaceholder="Shop the collection"
          urlPlaceholder="/shop"
        />
        <ButtonFields
          form={form}
          slot="secondary"
          title="Second button"
          labelPlaceholder="Browse brands"
          urlPlaceholder="/brands"
        />

        <BadgeEditor form={form} />

        <ArtworkField form={form} />

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button
            type="submit"
            loading={save.isPending}
            loadingText="Saving…"
            disabled={!isDirty}
          >
            Save headline hero
          </Button>
          {isDirty ? (
            <Button
              variant="ghost"
              disabled={save.isPending}
              onClick={() => form.reset(toValues(content))}
            >
              Discard changes
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">No unsaved changes.</p>
          )}
        </div>
      </form>
    </section>
  );
}
