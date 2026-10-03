import { useState } from "react";
import { Plus } from "lucide-react";
import {
  SECTION_MAX_COUNT,
  SECTION_TITLE_MAX_LENGTH,
  isSingletonSectionKind,
  sectionNeedsSource,
} from "@urcommerce/api-client";
import type {
  AdminSection,
  SectionKind,
  SectionSource,
} from "@urcommerce/api-client";
import { useAddSection } from "@/api/sections";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  BEST_SELLERS_HINT,
  KIND_DETAILS,
  KIND_ORDER,
  SOURCE_OPTIONS,
  SOURCE_TITLES,
  isSectionSource,
} from "./section-labels";

function unavailableReason(
  kind: SectionKind,
  sections: AdminSection[],
): string | null {
  if (!isSingletonSectionKind(kind)) return null;
  return sections.some((section) => section.kind === kind)
    ? "Already on your homepage"
    : null;
}

function firstAvailableKind(sections: AdminSection[]): SectionKind {
  return (
    KIND_ORDER.find((kind) => !unavailableReason(kind, sections)) ??
    "PRODUCT_CAROUSEL"
  );
}

function defaultTitle(kind: SectionKind, source: SectionSource): string {
  if (kind === "CATEGORY_GRID") return "Browse Categories";
  if (kind === "BRAND_STRIP") return "Shop by Brand";
  return SOURCE_TITLES[source];
}

function KindOption({
  kind,
  selected,
  reason,
  onSelect,
}: {
  kind: SectionKind;
  selected: boolean;
  reason: string | null;
  onSelect: () => void;
}) {
  const details = KIND_DETAILS[kind];
  return (
    <Button
      variant="outline"
      aria-pressed={selected}
      disabled={reason !== null}
      onClick={onSelect}
      className={cn(
        "h-auto w-full flex-col items-start gap-1 whitespace-normal p-3 text-left",
        selected && "border-primary bg-primary/5 ring-1 ring-primary",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <details.icon className="size-4 text-primary" aria-hidden />
        {details.label}
      </span>
      <span className="text-xs font-normal text-muted-foreground">
        {reason ?? details.description}
      </span>
    </Button>
  );
}

export function AddSectionPanel({ sections }: { sections: AdminSection[] }) {
  const [kind, setKind] = useState<SectionKind>(() =>
    firstAvailableKind(sections),
  );
  const [source, setSource] = useState<SectionSource>("NEWEST");
  const [title, setTitle] = useState("");
  const add = useAddSection({
    success: (section) =>
      `“${section.title}” added to the end of your homepage.`,
  });
  const full = sections.length >= SECTION_MAX_COUNT;
  const selectedUnavailable = unavailableReason(kind, sections) !== null;
  const needsSource = sectionNeedsSource(kind);

  const submit = () => {
    const trimmed = title.trim();
    add.mutate(
      {
        kind,
        ...(needsSource ? { source } : {}),
        ...(trimmed ? { title: trimmed } : {}),
      },
      {
        onSuccess: (_created, variables) => {
          setTitle("");
          if (isSingletonSectionKind(variables.kind)) {
            setKind("PRODUCT_CAROUSEL");
          }
        },
      },
    );
  };

  return (
    <section
      aria-labelledby="add-section-heading"
      className="rounded-xl border bg-card p-5"
    >
      <h2 id="add-section-heading" className="text-sm font-medium">
        Add a section
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {full
          ? `Your homepage has the maximum of ${SECTION_MAX_COUNT} sections. Remove one to add another.`
          : "New sections go to the bottom; move them up afterwards."}
      </p>

      <form
        className={cn(
          "mt-4 space-y-4",
          full && "pointer-events-none opacity-50",
        )}
        aria-disabled={full}
        onSubmit={(event) => {
          event.preventDefault();
          if (!full && !selectedUnavailable) submit();
        }}
      >
        <div role="group" aria-label="Section type" className="grid gap-2">
          {KIND_ORDER.map((option) => (
            <KindOption
              key={option}
              kind={option}
              selected={kind === option}
              reason={unavailableReason(option, sections)}
              onSelect={() => setKind(option)}
            />
          ))}
        </div>

        {needsSource ? (
          <SelectField
            id="new-section-source"
            label="Which products"
            hint={source === "BEST_SELLERS" ? BEST_SELLERS_HINT : undefined}
            options={SOURCE_OPTIONS}
            value={source}
            disabled={full}
            onChange={(event) => {
              const value = event.target.value;
              if (isSectionSource(value)) setSource(value);
            }}
          />
        ) : null}

        <TextField
          id="new-section-title"
          label="Heading"
          optional
          value={title}
          maxLength={SECTION_TITLE_MAX_LENGTH}
          placeholder={defaultTitle(kind, source)}
          disabled={full}
          onChange={(event) => setTitle(event.target.value)}
        />

        <Button
          type="submit"
          fullWidth
          leading={<Plus aria-hidden />}
          loading={add.isPending}
          loadingText="Adding…"
          disabled={full || selectedUnavailable}
        >
          Add section
        </Button>
      </form>
    </section>
  );
}
