"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReviewImage } from "@urcommerce/api-client";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const arrowSteps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

function PhotoViewer({
  images,
  start,
  authorName,
  onClose,
}: {
  images: ReviewImage[];
  start: number;
  authorName?: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(start);
  const image = images[index];
  const many = images.length > 1;
  const step = (by: number) =>
    setIndex((current) => (current + by + images.length) % images.length);

  useEffect(() => {
    const count = images.length;
    const onKey = (event: KeyboardEvent) => {
      const by = arrowSteps[event.key];
      if (by) setIndex((current) => (current + by + count) % count);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [images.length]);

  if (!image) return null;

  return (
    <Dialog
      onClose={onClose}
      label={`Photo ${index + 1} of ${images.length}${authorName ? ` from ${authorName}` : ""}`}
      className="max-w-2xl p-3 sm:p-4"
    >
      <div className="relative mt-8 aspect-square w-full overflow-hidden rounded-lg bg-muted">
        <Image
          key={image.url}
          src={image.url}
          alt={`Review photo ${index + 1}`}
          fill
          sizes="(min-width: 672px) 640px, 100vw"
          className="object-contain"
        />
        {many ? (
          <>
            <IconButton
              label="Previous photo"
              variant="secondary"
              shape="pill"
              onClick={() => step(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 shadow"
            >
              <ChevronLeft aria-hidden />
            </IconButton>
            <IconButton
              label="Next photo"
              variant="secondary"
              shape="pill"
              onClick={() => step(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 shadow"
            >
              <ChevronRight aria-hidden />
            </IconButton>
          </>
        ) : null}
      </div>
      {many ? (
        <p className="mt-2 text-center text-xs tabular-nums text-muted-foreground">
          {index + 1} / {images.length}
        </p>
      ) : null}
    </Dialog>
  );
}

export function ReviewPhotos({
  images,
  authorName,
  size = "md",
  className,
}: {
  images: ReviewImage[];
  authorName?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (images.length === 0) return null;

  return (
    <>
      <ul className={cn("flex flex-wrap gap-2", className)}>
        {images.map((image, index) => (
          <li key={image.url}>
            <Button
              variant="ghost"
              shape="rounded"
              onClick={() => setOpen(index)}
              aria-label={`View photo ${index + 1} of ${images.length}`}
              className={cn(
                "relative block h-auto overflow-hidden border bg-muted p-0 hover:opacity-85",
                size === "sm" ? "size-12" : "size-16",
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </Button>
          </li>
        ))}
      </ul>
      {open === null ? null : (
        <PhotoViewer
          images={images}
          start={open}
          authorName={authorName}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
