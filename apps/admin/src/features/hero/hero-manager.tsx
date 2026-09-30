import { useState } from "react";
import { GalleryHorizontal } from "lucide-react";
import { HERO_MAX_SLIDES, isApiError } from "@urcommerce/api-client";
import type { AdminHeroSlide } from "@urcommerce/api-client";
import { toast } from "sonner";
import { useAddHeroSlide, useHero, useReorderHeroSlides } from "@/api/hero";
import {
  ImageDropzone,
  type LimitDetails,
  type UploadedImage,
} from "@/components/ui/image-dropzone";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { HeroSettingsCard } from "./hero-settings-card";
import { HeroSlideCard } from "./hero-slide-card";

const TITLE = "Homepage hero";
const DESCRIPTION =
  "Banner images at the top of your homepage. The first slide loads first; drag to reorder.";
const SIZE_HINT =
  "Wide banners work best — 2400 × 1000 px. Keep key text near the centre; phones crop the sides.";

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

function limitMessage({ room, skipped }: LimitDetails): string {
  return `${skipped} ${plural(skipped, "file was", "files were")} skipped. The hero holds up to ${HERO_MAX_SLIDES} slides, so only ${room} more ${plural(room, "fits", "fit")}.`;
}

function addedMessage(count: number): string {
  return count === 1 ? "Slide added." : `${count} slides added.`;
}

function failureMessage(cause: unknown): string {
  return isApiError(cause) ? cause.message : "Could not add that slide.";
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return items;
  next.splice(to, 0, moved);
  return next;
}

function revokePreviews(images: UploadedImage[]) {
  for (const image of images) URL.revokeObjectURL(image.previewUrl);
}

function SlideCount({ count }: { count: number }) {
  const full = count >= HERO_MAX_SLIDES;
  return (
    <p
      className={cn(
        "rounded-full border px-3 py-1 text-sm tabular-nums",
        full
          ? "border-amber-500/30 bg-amber-500/10 text-amber-800"
          : "text-muted-foreground",
      )}
    >
      <span className="font-medium text-foreground">{count}</span> of{" "}
      {HERO_MAX_SLIDES} slides
    </p>
  );
}

function EmptyIntro() {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-5">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
        <GalleryHorizontal className="size-4" aria-hidden />
      </span>
      <div>
        <h2 className="font-medium">No slides yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your storefront shows its default hero until you add a slide. Drop
          one or more banners below; they appear in the order you add them.
        </p>
      </div>
    </div>
  );
}

function useSlideCreation() {
  const [adding, setAdding] = useState(0);
  const addSlide = useAddHeroSlide({ silentError: true });

  const createSlides = async (images: UploadedImage[]) => {
    if (images.length === 0) return;
    setAdding(images.length);
    let added = 0;
    try {
      for (const image of images) {
        await addSlide.mutateAsync({ imageObjectKey: image.objectKey });
        added += 1;
        setAdding(images.length - added);
      }
    } catch (cause) {
      toast.error(failureMessage(cause));
    } finally {
      setAdding(0);
      revokePreviews(images);
    }
    if (added > 0) toast.success(addedMessage(added));
  };

  return { adding, createSlides };
}

function SlideList({ slides }: { slides: AdminHeroSlide[] }) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const reorder = useReorderHeroSlides({ success: "Slide order saved." });

  const moveSlide = (from: number, to: number) => {
    if (from === to || to < 0 || to >= slides.length) return;
    reorder.mutate(
      moveItem(
        slides.map((slide) => slide.id),
        from,
        to,
      ),
    );
  };

  const dropOnto = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const from = slides.findIndex((slide) => slide.id === draggingId);
    const to = slides.findIndex((slide) => slide.id === targetId);
    if (from < 0 || to < 0) return;
    moveSlide(from, to);
  };

  const endDrag = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  return (
    <ol className="space-y-3" aria-label="Hero slides in display order">
      {slides.map((slide, index) => (
        <HeroSlideCard
          key={slide.id}
          slide={slide}
          index={index}
          total={slides.length}
          dragging={draggingId === slide.id}
          dropTarget={dropTargetId === slide.id}
          onMove={moveSlide}
          dragHandleProps={{
            draggable: slides.length > 1,
            onDragStart: (event) => {
              event.dataTransfer.effectAllowed = "move";
              setDraggingId(slide.id);
            },
            onDragEnd: endDrag,
          }}
          dropTargetProps={{
            onDragOver: (event) => {
              if (!draggingId) return;
              event.preventDefault();
              setDropTargetId(slide.id);
            },
            onDragLeave: () =>
              setDropTargetId((current) =>
                current === slide.id ? null : current,
              ),
            onDrop: (event) => {
              if (!draggingId) return;
              event.preventDefault();
              dropOnto(slide.id);
              endDrag();
            },
          }}
        />
      ))}
    </ol>
  );
}

export function HeroManager() {
  const { data: hero, isPending, error } = useHero();
  const { adding, createSlides } = useSlideCreation();

  if (isPending) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <LoadingState variant="detail" label="Loading homepage hero" />
      </>
    );
  }

  if (error || !hero) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <ErrorState
          message={
            isApiError(error)
              ? error.message
              : "We could not load your homepage hero."
          }
        />
      </>
    );
  }

  const slides = hero.slides;
  const empty = slides.length === 0;
  const full = slides.length >= HERO_MAX_SLIDES;
  const room = Math.max(HERO_MAX_SLIDES - slides.length - adding, 0);

  return (
    <>
      <PageHeader
        title={TITLE}
        description={DESCRIPTION}
        action={<SlideCount count={slides.length} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          {empty ? <EmptyIntro /> : null}

          <section
            aria-label="Add slides"
            className={cn(!empty && "order-last pt-2")}
          >
            {!empty ? (
              <h2 className="mb-2 text-sm font-medium">Add slides</h2>
            ) : null}
            <ImageDropzone
              scope="store"
              images={[]}
              onChange={(uploaded) => void createSlides(uploaded)}
              maxImages={room}
              disabled={room === 0}
              disabledReason={
                full
                  ? `Your hero has the maximum of ${HERO_MAX_SLIDES} slides. Remove one to add another.`
                  : undefined
              }
              hint={SIZE_HINT}
              limitMessage={limitMessage}
            />
            {adding > 0 ? (
              <p role="status" className="mt-2 text-sm text-muted-foreground">
                Adding {adding} {plural(adding, "slide", "slides")} to your
                hero…
              </p>
            ) : null}
          </section>

          {!empty ? <SlideList slides={slides} /> : null}
        </div>

        <aside className="space-y-4">
          <HeroSettingsCard
            settings={{ autoplay: hero.autoplay, intervalMs: hero.intervalMs }}
          />
        </aside>
      </div>
    </>
  );
}
