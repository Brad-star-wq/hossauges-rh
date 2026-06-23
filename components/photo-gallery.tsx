"use client";

import { useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Placeholder } from "@/components/placeholder";
import { cn } from "@/lib/cn";

/**
 * Photo gallery for the flavor detail view. Native scroll-snap gives touch/drag
 * swiping on mobile for free; arrows + dots drive it on desktop. One photo shows
 * cleanly with no controls. Fixed aspect ratio → no layout shift. Lazy after #1.
 */
export function PhotoGallery({
  photos,
  alt,
  ratio = "4/3",
  placeholderLabel = "Flavor photo",
}: {
  photos: string[];
  alt: string;
  /** CSS aspect-ratio for each slide + the empty placeholder. */
  ratio?: string;
  placeholderLabel?: string;
}) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return <Placeholder label={placeholderLabel} ratio={ratio} tone="navy" />;
  }

  const single = photos.length === 1;

  function scrollToIndex(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(photos.length - 1, i));
    track.scrollTo({
      left: clamped * track.clientWidth,
      behavior: reduceMotion ? "auto" : "smooth",
    });
    setIndex(clamped);
  }

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== index) setIndex(i);
  }

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        onScroll={onScroll}
        className={cn(
          "flex w-full snap-x snap-mandatory overflow-x-auto",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {photos.map((src, i) => (
          <li key={i} className="w-full shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={i === 0 ? alt : `${alt} — photo ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              style={{ aspectRatio: ratio }}
              className="w-full border border-navy/20 object-cover"
            />
          </li>
        ))}
      </ul>

      {!single && (
        <>
          {/* Arrows */}
          <button
            type="button"
            onClick={() => scrollToIndex(index - 1)}
            disabled={index === 0}
            aria-label="Previous photo"
            className="font-mono absolute left-2 top-1/2 -translate-y-1/2 border border-navy/30 bg-cream/90 px-3 py-2 text-navy transition-colors hover:border-ember hover:text-ember disabled:opacity-30"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(index + 1)}
            disabled={index === photos.length - 1}
            aria-label="Next photo"
            className="font-mono absolute right-2 top-1/2 -translate-y-1/2 border border-navy/30 bg-cream/90 px-3 py-2 text-navy transition-colors hover:border-ember hover:text-ember disabled:opacity-30"
          >
            ›
          </button>

          {/* Dots */}
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "size-2 rounded-full border border-cream transition-colors",
                  i === index ? "bg-ember" : "bg-cream/50",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
