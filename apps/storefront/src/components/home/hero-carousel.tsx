"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getImageProps } from "next/image";
import { preload } from "react-dom";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Hero, HeroSlide } from "@urcommerce/api-client";
import { IconButton } from "@/components/ui/button";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

const SLIDE_SIZES = "(min-width: 1280px) 1216px, 100vw";

function SlideImage({
  slide,
  first,
  onBroken,
}: {
  slide: HeroSlide;
  first: boolean;
  onBroken: () => void;
}) {
  const alt = slide.alt ?? "";
  const shared = { alt, fill: true, sizes: SLIDE_SIZES } as const;
  const {
    props: { srcSet: desktopSrcSet, ...image },
  } = getImageProps({ ...shared, src: slide.imageUrl, priority: first });
  if (first) {
    preload(image.src, {
      as: "image",
      fetchPriority: "high",
      imageSrcSet: desktopSrcSet,
      imageSizes: SLIDE_SIZES,
    });
  }
  const mobileSrcSet = slide.mobileImageUrl
    ? getImageProps({ ...shared, src: slide.mobileImageUrl }).props.srcSet
    : undefined;

  return (
    <picture>
      {mobileSrcSet ? (
        <source media="(max-width: 640px)" srcSet={mobileSrcSet} />
      ) : null}
      <img
        {...image}
        alt={alt}
        srcSet={desktopSrcSet}
        loading={first ? "eager" : "lazy"}
        fetchPriority={first ? "high" : "auto"}
        onError={onBroken}
        ref={(element) => {
          if (element?.complete && element.naturalWidth === 0) onBroken();
        }}
        className="object-cover"
      />
    </picture>
  );
}

function useAutoplayControl(
  embla: ReturnType<typeof useEmblaCarousel>[1],
  enabled: boolean,
) {
  const [userPaused, setUserPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = userPaused || hovering || focused;

  useEffect(() => {
    const autoplay = embla?.plugins()?.autoplay;
    if (!enabled || !autoplay) return;
    if (paused) autoplay.stop();
    else autoplay.play();
  }, [embla, enabled, paused]);

  return {
    userPaused,
    togglePaused: () => setUserPaused((current) => !current),
    regionHandlers: {
      onMouseEnter: () => setHovering(true),
      onMouseLeave: () => setHovering(false),
      onFocus: () => setFocused(true),
      onBlur: (event: React.FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
        }
      },
    },
  };
}

function Carousel({
  slides,
  autoplay,
  intervalMs,
  onBroken,
}: {
  slides: HeroSlide[];
  autoplay: boolean;
  intervalMs: number;
  onBroken: (id: string) => void;
}) {
  const reducedMotion = useReducedMotion();
  const multiple = slides.length > 1;
  const rotates = autoplay && multiple && !reducedMotion;

  const plugins = useMemo(
    () =>
      rotates
        ? [
            Autoplay({
              delay: intervalMs,
              stopOnInteraction: false,
              stopOnMouseEnter: false,
              stopOnFocusIn: false,
            }),
          ]
        : [],
    [rotates, intervalMs],
  );

  const [viewportRef, embla] = useEmblaCarousel(
    { loop: multiple, active: multiple, duration: reducedMotion ? 0 : 28 },
    plugins,
  );
  const [selected, setSelected] = useState(0);
  const control = useAutoplayControl(embla, rotates);

  useEffect(() => {
    if (!embla) return;
    const sync = () => setSelected(embla.selectedScrollSnap());
    sync();
    embla.on("select", sync).on("reInit", sync);
    return () => {
      embla.off("select", sync).off("reInit", sync);
    };
  }, [embla]);

  const scrollPrev = useCallback(() => embla?.scrollPrev(), [embla]);
  const scrollNext = useCallback(() => embla?.scrollNext(), [embla]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="container-page pt-4 sm:pt-6"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") scrollPrev();
        if (event.key === "ArrowRight") scrollNext();
      }}
      {...control.regionHandlers}
    >
      <div className="relative overflow-hidden rounded-2xl bg-muted">
        <div ref={viewportRef} className="overflow-hidden">
          <div className="flex touch-pan-y">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${slides.length}`}
                aria-hidden={multiple && index !== selected ? true : undefined}
                className="relative aspect-[16/9] min-w-0 shrink-0 grow-0 basis-full sm:aspect-[12/5]"
              >
                <SlideImage
                  slide={slide}
                  first={index === 0}
                  onBroken={() => onBroken(slide.id)}
                />
              </div>
            ))}
          </div>
        </div>

        {multiple ? (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-2 shadow-sm backdrop-blur-sm">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={index === selected ? "true" : undefined}
                  onClick={() => embla?.scrollTo(index)}
                  className={cn(
                    "h-1.5 rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none",
                    index === selected
                      ? "w-5 bg-foreground"
                      : "w-1.5 bg-foreground/30 hover:bg-foreground/60",
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {rotates ? (
                <IconButton
                  label={control.userPaused ? "Play slideshow" : "Pause slideshow"}
                  size="icon-sm"
                  shape="pill"
                  variant="outline"
                  onClick={control.togglePaused}
                  className="border-transparent bg-background/85 backdrop-blur-sm"
                >
                  {control.userPaused ? <Play /> : <Pause />}
                </IconButton>
              ) : null}
              <IconButton
                label="Previous slide"
                size="icon-sm"
                shape="pill"
                variant="outline"
                onClick={scrollPrev}
                className="border-transparent bg-background/85 backdrop-blur-sm"
              >
                <ChevronLeft />
              </IconButton>
              <IconButton
                label="Next slide"
                size="icon-sm"
                shape="pill"
                variant="outline"
                onClick={scrollNext}
                className="border-transparent bg-background/85 backdrop-blur-sm"
              >
                <ChevronRight />
              </IconButton>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function HeroCarousel({
  hero,
  fallback,
  footer,
}: {
  hero: Hero;
  fallback: ReactNode;
  footer?: ReactNode;
}) {
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());
  const slides = useMemo(
    () => hero.slides.filter((slide) => !broken.has(slide.id)),
    [hero.slides, broken],
  );

  const markBroken = useCallback((id: string) => {
    setBroken((current) =>
      current.has(id) ? current : new Set(current).add(id),
    );
  }, []);

  if (slides.length === 0) return <>{fallback}</>;

  return (
    <>
      <Carousel
        slides={slides}
        autoplay={hero.autoplay}
        intervalMs={hero.intervalMs}
        onBroken={markBroken}
      />
      {footer}
    </>
  );
}
