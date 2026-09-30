"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type GalleryImage = { url: string; alt: string | null };

export function ProductGallery({
  images,
  productName,
  badge,
}: {
  images: GalleryImage[];
  productName: string;
  badge?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [broken, setBroken] = useState<Set<string>>(new Set());

  const identity = images.map((image) => image.url).join("|");

  useEffect(() => {
    setActive(0);
  }, [identity]);

  const markBroken = (url: string) =>
    setBroken((current) => new Set(current).add(url));

  const usable = images.filter((image) => !broken.has(image.url));
  const current = usable[active] ?? usable[0];

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {usable.length > 1 ? (
        <div className="flex gap-3 overflow-x-auto pb-1 sm:w-20 sm:flex-col sm:overflow-visible sm:pb-0">
          {usable.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`View image ${index + 1} of ${usable.length}`}
              aria-current={index === active}
              className={cn(
                "relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-colors sm:w-full",
                index === active
                  ? "border-foreground"
                  : "border-transparent hover:border-foreground/25",
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="80px"
                onError={() => markBroken(image.url)}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative min-w-0 flex-1">
        <div className="relative aspect-4/5 overflow-hidden rounded-xl bg-muted">
          {current ? (
            <Image
              src={current.url}
              alt={current.alt ?? productName}
              fill
              priority
              sizes="(min-width: 1024px) 480px, (min-width: 640px) calc(100vw - 140px), 100vw"
              onError={() => markBroken(current.url)}
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <span className="font-display text-6xl text-muted-foreground/25">
                {productName.charAt(0)}
              </span>
            </div>
          )}
          {badge ? <div className="absolute left-4 top-4">{badge}</div> : null}
        </div>
      </div>
    </div>
  );
}
