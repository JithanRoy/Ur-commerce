import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { SECTION_TITLE_MAX_LENGTH } from "@urcommerce/api-client";
import type { AdminSection } from "@urcommerce/api-client";
import {
  useRemoveSection,
  useUpdateSection,
  type UpdateSectionVariables,
} from "@/api/sections";
import { Button, IconButton } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BEST_SELLERS_HINT,
  KIND_DETAILS,
  SOURCE_LABELS,
  SOURCE_OPTIONS,
  isSectionSource,
  itemLimitOptions,
} from "./section-labels";

function savedMessage(
  section: AdminSection,
  { input }: UpdateSectionVariables,
): string {
  if (input.isActive === true)
    return `“${section.title}” is back on your homepage.`;
  if (input.isActive === false)
    return `“${section.title}” is hidden from your homepage.`;
  if (input.title !== undefined) return `Renamed to “${section.title}”.`;
  if (input.source)
    return `“${section.title}” now shows ${SOURCE_LABELS[input.source].toLowerCase()}.`;
  return `“${section.title}” now shows up to ${section.itemLimit} items.`;
}

function displayedSection(
  section: AdminSection,
  pending: UpdateSectionVariables["input"] | undefined,
): AdminSection {
  return pending ? { ...section, ...pending } : section;
}

function TitleField({
  section,
  onSave,
  disabled,
}: {
  section: AdminSection;
  onSave: (title: string) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(section.title);

  useEffect(() => {
    setDraft(section.title);
  }, [section.title]);

  const commit = () => {
    const title = draft.trim();
    if (title === "" || title === section.title) {
      setDraft(section.title);
      return;
    }
    onSave(title);
  };

  return (
    <TextField
      id={`section-title-${section.id}`}
      label="Heading"
      hint="Shown above the section. Press Enter to save."
      value={draft}
      maxLength={SECTION_TITLE_MAX_LENGTH}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          setDraft(section.title);
          event.currentTarget.blur();
        }
      }}
      className="h-9"
    />
  );
}

function RemoveConfirmation({
  title,
  onConfirm,
  onCancel,
  pending,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div
      role="alertdialog"
      aria-label={`Remove “${title}”?`}
      className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
    >
      <p className="mr-auto text-sm">
        Remove this section? To keep its settings, hide it instead.
      </p>
      <Button
        size="sm"
        variant="destructive"
        loading={pending}
        loadingText="Removing…"
        onClick={onConfirm}
      >
        Remove section
      </Button>
      <Button size="sm" variant="outline" onClick={onCancel} disabled={pending}>
        Keep
      </Button>
    </div>
  );
}

export function SectionCard({
  section,
  index,
  total,
  onMove,
}: {
  section: AdminSection;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [unsaved, setUnsaved] = useState<UpdateSectionVariables["input"]>();
  const update = useUpdateSection({ success: savedMessage });
  const remove = useRemoveSection({
    success: `“${section.title}” removed from your homepage.`,
    onSettled: () => setConfirming(false),
  });
  const shown = displayedSection(section, unsaved);
  const details = KIND_DETAILS[section.kind];
  const position = index + 1;
  const save = (input: UpdateSectionVariables["input"]) => {
    setUnsaved((current) => ({ ...current, ...input }));
    update.mutate(
      { sectionId: section.id, input },
      { onSettled: () => setUnsaved(undefined) },
    );
  };

  return (
    <li
      aria-label={`Section ${position} of ${total}: ${section.title}`}
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-4 transition-colors",
        !shown.isActive && "border-dashed bg-muted/30",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-muted px-1.5 text-xs font-semibold tabular-nums">
          {position}
        </span>
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <details.icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{section.title}</p>
          <p className="text-xs text-muted-foreground">
            {details.label}
            {shown.source ? ` · ${SOURCE_LABELS[shown.source]}` : null}
          </p>
        </div>
        {!shown.isActive ? (
          <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-xs font-medium text-amber-700">
            Hidden
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-0.5">
          <IconButton
            label={`Move “${section.title}” up`}
            size="icon-sm"
            variant="ghost"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
          >
            <ArrowUp aria-hidden />
          </IconButton>
          <IconButton
            label={`Move “${section.title}” down`}
            size="icon-sm"
            variant="ghost"
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1)}
          >
            <ArrowDown aria-hidden />
          </IconButton>
          <IconButton
            label={`Remove “${section.title}”`}
            size="icon-sm"
            variant="destructive-ghost"
            disabled={remove.isPending}
            onClick={() => setConfirming(true)}
          >
            <Trash2 aria-hidden />
          </IconButton>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TitleField
          section={section}
          disabled={update.isPending}
          onSave={(title) => save({ title })}
        />
        <SelectField
          id={`section-limit-${section.id}`}
          label="How many"
          options={itemLimitOptions(shown.itemLimit, details.itemNoun)}
          value={String(shown.itemLimit)}
          disabled={update.isPending}
          onChange={(event) => save({ itemLimit: Number(event.target.value) })}
        />
        {shown.source ? (
          <SelectField
            id={`section-source-${section.id}`}
            label="Which products"
            hint={
              shown.source === "BEST_SELLERS" ? BEST_SELLERS_HINT : undefined
            }
            options={SOURCE_OPTIONS}
            value={shown.source}
            disabled={update.isPending}
            onChange={(event) => {
              const source = event.target.value;
              if (isSectionSource(source)) save({ source });
            }}
            fieldClassName="sm:col-span-2"
          />
        ) : null}
      </div>

      <Checkbox
        id={`section-active-${section.id}`}
        label="Show on homepage"
        description="Hidden sections keep their settings, ready to switch back on."
        checked={shown.isActive}
        disabled={update.isPending}
        onChange={(event) => save({ isActive: event.target.checked })}
      />

      {confirming ? (
        <RemoveConfirmation
          title={section.title}
          pending={remove.isPending}
          onConfirm={() => remove.mutate(section.id)}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </li>
  );
}
