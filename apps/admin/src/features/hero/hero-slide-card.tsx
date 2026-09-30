import { useEffect, useState, type ComponentProps } from "react";
import { ArrowDown, ArrowUp, EyeOff, GripVertical, Trash2 } from "lucide-react";
import { HERO_ALT_MAX_LENGTH } from "@urcommerce/api-client";
import type { AdminHeroSlide } from "@urcommerce/api-client";
import { useRemoveHeroSlide, useUpdateHeroSlide } from "@/api/hero";
import { Button, IconButton } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type SlideDragHandleProps = Pick<
  ComponentProps<"div">,
  "draggable" | "onDragStart" | "onDragEnd"
>;

export type SlideDropTargetProps = Pick<
  ComponentProps<"li">,
  "onDragOver" | "onDragLeave" | "onDrop"
>;

function normalisedAlt(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function altSavedMessage(slide: AdminHeroSlide): string {
  return slide.alt ? "Alt text saved." : "Slide marked as decorative.";
}

function AltTextField({ slide }: { slide: AdminHeroSlide }) {
  const [draft, setDraft] = useState(slide.alt ?? "");
  const save = useUpdateHeroSlide({ success: altSavedMessage });

  useEffect(() => {
    setDraft(slide.alt ?? "");
  }, [slide.alt]);

  const commit = () => {
    const alt = normalisedAlt(draft);
    if (alt === slide.alt) {
      setDraft(slide.alt ?? "");
      return;
    }
    save.mutate({ slideId: slide.id, alt });
  };

  return (
    <TextField
      id={`hero-alt-${slide.id}`}
      label="Alt text"
      hint="Describes the image for screen readers. Leave empty if it is purely decorative."
      value={draft}
      maxLength={HERO_ALT_MAX_LENGTH}
      placeholder="e.g. Model wearing the new Eid panjabi collection"
      disabled={save.isPending}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          setDraft(slide.alt ?? "");
          event.currentTarget.blur();
        }
      }}
      className="h-9"
    />
  );
}

function RemoveConfirmation({
  onConfirm,
  onCancel,
  pending,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div
      role="alertdialog"
      aria-label="Remove this slide?"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
    >
      <p className="mr-auto text-sm">
        Remove this slide? It disappears from your homepage.
      </p>
      <Button
        size="sm"
        variant="destructive"
        loading={pending}
        loadingText="Removing…"
        onClick={onConfirm}
      >
        Remove slide
      </Button>
      <Button size="sm" variant="outline" onClick={onCancel} disabled={pending}>
        Keep
      </Button>
    </div>
  );
}

export function HeroSlideCard({
  slide,
  index,
  total,
  dragging,
  dropTarget,
  dragHandleProps,
  dropTargetProps,
  onMove,
}: {
  slide: AdminHeroSlide;
  index: number;
  total: number;
  dragging: boolean;
  dropTarget: boolean;
  dragHandleProps: SlideDragHandleProps;
  dropTargetProps: SlideDropTargetProps;
  onMove: (from: number, to: number) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const remove = useRemoveHeroSlide({
    success: "Slide removed from your homepage.",
    onSettled: () => setConfirming(false),
  });
  const position = index + 1;

  return (
    <li
      {...dropTargetProps}
      aria-label={`Slide ${position} of ${total}`}
      className={cn(
        "group flex flex-col gap-4 rounded-xl border bg-card p-3 transition-all sm:flex-row",
        dragging && "opacity-40",
        dropTarget && !dragging && "ring-2 ring-primary ring-offset-2",
      )}
    >
      <div
        {...dragHandleProps}
        title={dragHandleProps.draggable ? "Drag to reorder" : undefined}
        className={cn(
          "relative aspect-[12/5] w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-72",
          dragHandleProps.draggable && "cursor-grab active:cursor-grabbing",
        )}
      >
        <img
          src={slide.imageUrl}
          alt={slide.alt ?? ""}
          className="size-full object-cover"
          loading={index === 0 ? "eager" : "lazy"}
          draggable={false}
        />
        <span className="absolute left-2 top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-background/90 px-1.5 text-xs font-semibold tabular-nums backdrop-blur-sm">
          {position}
        </span>
        <span
          aria-hidden
          className="absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-md bg-background/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
        >
          <GripVertical className="size-4" />
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">Slide {position}</p>
          {index === 0 ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Loads first
            </span>
          ) : null}
          {!slide.alt ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <EyeOff className="size-3" aria-hidden />
              Decorative
            </span>
          ) : null}
          {!slide.isActive ? (
            <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-xs font-medium text-amber-700">
              Hidden on storefront
            </span>
          ) : null}

          <div className="ml-auto flex items-center gap-0.5">
            <IconButton
              label={`Move slide ${position} up`}
              size="icon-sm"
              variant="ghost"
              disabled={index === 0}
              onClick={() => onMove(index, index - 1)}
            >
              <ArrowUp aria-hidden />
            </IconButton>
            <IconButton
              label={`Move slide ${position} down`}
              size="icon-sm"
              variant="ghost"
              disabled={index === total - 1}
              onClick={() => onMove(index, index + 1)}
            >
              <ArrowDown aria-hidden />
            </IconButton>
            <IconButton
              label={`Remove slide ${position}`}
              size="icon-sm"
              variant="destructive-ghost"
              disabled={remove.isPending}
              onClick={() => setConfirming(true)}
            >
              <Trash2 aria-hidden />
            </IconButton>
          </div>
        </div>

        <AltTextField slide={slide} />

        {confirming ? (
          <RemoveConfirmation
            pending={remove.isPending}
            onConfirm={() => remove.mutate(slide.id)}
            onCancel={() => setConfirming(false)}
          />
        ) : null}
      </div>
    </li>
  );
}
