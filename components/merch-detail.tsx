"use client";

import { useMemo, useState } from "react";
import { PhotoGallery } from "@/components/photo-gallery";
import { formatPrice } from "@/lib/types";
import { cn } from "@/lib/cn";
import type { SquareMerchItem } from "@/lib/square";

// NOTE: importing only the TYPE from lib/square — `import type` is erased at
// build time, so the server-only module is never pulled into the client bundle.
type Item = SquareMerchItem;

const selBase =
  "font-mono min-h-11 px-4 text-xs uppercase tracking-[0.16em] border transition-colors";

function find(item: Item, color: string | null, size: string | null) {
  return item.variations.find(
    (v) =>
      (color === null || v.color === color) && (size === null || v.size === size),
  );
}

function firstSizeFor(item: Item, color: string | null): string | null {
  // Prefer a buyable size, then any in-stock size, then the first size.
  return (
    item.sizes.find((s) => find(item, color, s)?.purchasable) ??
    item.sizes.find((s) => !find(item, color, s)?.soldOut && find(item, color, s)) ??
    item.sizes[0] ??
    null
  );
}

function firstColor(item: Item): string | null {
  return (
    item.colors.find((c) => item.variations.some((v) => v.color === c && v.purchasable)) ??
    item.colors.find((c) => item.variations.some((v) => v.color === c && !v.soldOut)) ??
    item.colors[0] ??
    null
  );
}

export function MerchDetail({ item }: { item: Item }) {
  const hasColors = item.colors.length > 0;
  const hasSizes = item.sizes.length > 0;
  const showColorPicker = item.colors.length > 1;
  const showSizePicker = item.sizes.length > 1;

  // Initial selection: a sensible, likely-buyable default.
  const initialColor = hasColors ? firstColor(item) : null;
  const [color, setColor] = useState<string | null>(initialColor);
  const [size, setSize] = useState<string | null>(
    hasSizes ? firstSizeFor(item, initialColor) : null,
  );

  const selected = useMemo(
    () =>
      find(item, hasColors ? color : null, hasSizes ? size : null) ??
      // No dimensions at all → the single variation, if any.
      (!hasColors && !hasSizes ? item.variations[0] : undefined),
    [item, color, size, hasColors, hasSizes],
  );

  // Photos follow the selected color: that color's variation photos, else the
  // item's general photos (Round 7 #2 fallback).
  const photos = useMemo(() => {
    if (color) {
      const perColor = Array.from(
        new Set(
          item.variations.filter((v) => v.color === color).flatMap((v) => v.imageUrls),
        ),
      );
      if (perColor.length) return perColor;
    }
    return item.imageUrls;
  }, [item, color]);

  function colorEnabled(c: string) {
    return item.variations.some((v) => v.color === c && !v.soldOut);
  }
  function sizeEnabled(s: string) {
    const v = find(item, hasColors ? color : null, s);
    return Boolean(v && !v.soldOut);
  }

  function selectColor(c: string) {
    setColor(c);
    // Keep the chosen size if it's still in stock for this color; otherwise move
    // to the first available size so the selection stays coherent.
    if (hasSizes && (!size || !find(item, c, size) || find(item, c, size)?.soldOut)) {
      setSize(firstSizeFor(item, c));
    }
  }

  const buy = selected?.purchasable ? selected.checkoutUrl : null;
  const buyLabel = (() => {
    if (buy) return "Buy on Square";
    if (!selected) return "Select options";
    if (selected.soldOut) return "Sold out";
    if (selected.priceCents == null) return "Unavailable online";
    return "Unavailable";
  })();

  const shownPrice =
    selected?.priceCents != null
      ? formatPrice(selected.priceCents)
      : item.multiPrice
        ? `From ${formatPrice(item.priceCents)}`
        : formatPrice(item.priceCents);

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* Gallery — remounts on color change so it resets to the first photo. */}
      <div>
        <PhotoGallery
          key={color ?? "default"}
          photos={photos}
          alt={item.name}
          ratio="4/5"
          placeholderLabel="Merch photo"
        />
      </div>

      <div className="flex flex-col">
        <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.95] text-navy sm:text-5xl">
          {item.name}
        </h1>
        <p className="font-mono mt-3 text-lg text-char">{shownPrice}</p>
        {item.description && (
          <p className="mt-4 max-w-prose whitespace-pre-line text-char">
            {item.description}
          </p>
        )}

        {/* Color buttons */}
        {showColorPicker && (
          <div className="mt-8">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-smoke">
              Color{color ? <span className="text-char"> · {color}</span> : null}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.colors.map((c) => {
                const enabled = colorEnabled(c);
                const isSel = c === color;
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={!enabled}
                    aria-pressed={isSel}
                    onClick={() => selectColor(c)}
                    className={cn(
                      selBase,
                      isSel
                        ? "border-ember bg-ember text-cream"
                        : enabled
                          ? "border-navy/30 text-navy hover:border-ember"
                          : "cursor-not-allowed border-navy/15 text-smoke line-through",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Size buttons */}
        {showSizePicker && (
          <div className="mt-6">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-smoke">
              Size{size ? <span className="text-char"> · {size}</span> : null}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.sizes.map((s) => {
                const enabled = sizeEnabled(s);
                const isSel = s === size;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={!enabled}
                    aria-pressed={isSel}
                    onClick={() => setSize(s)}
                    className={cn(
                      selBase,
                      isSel
                        ? "border-ember bg-ember text-cream"
                        : enabled
                          ? "border-navy/30 text-navy hover:border-ember"
                          : "cursor-not-allowed border-navy/15 text-smoke line-through",
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Buy */}
        <div className="mt-8">
          {buy ? (
            <a
              href={buy}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono inline-flex min-h-12 w-full items-center justify-center bg-ember-press px-6 text-xs uppercase tracking-[0.18em] text-cream transition-colors hover:bg-navy sm:w-auto"
            >
              {buyLabel}
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="font-mono inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center border border-navy/20 bg-sage-wash px-6 text-xs uppercase tracking-[0.18em] text-smoke sm:w-auto"
            >
              {buyLabel}
            </button>
          )}
          <p className="font-mono mt-3 text-[0.6rem] uppercase tracking-[0.14em] text-smoke">
            Checkout is handled securely by Square.
          </p>
        </div>
      </div>
    </div>
  );
}
