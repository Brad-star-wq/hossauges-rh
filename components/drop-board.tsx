"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { Stamp } from "@/components/stamp";
import { Placeholder } from "@/components/placeholder";
import { Button } from "@/components/button";
import {
  type Drop,
  type DropFlavor,
  formatPrice,
  meatTypeLabel,
} from "@/lib/types";
import { cn } from "@/lib/cn";

/** Compact menu row for the condensed (home) board — tight, no photo. */
function CondensedRow({ flavor }: { flavor: DropFlavor }) {
  return (
    <li className="flex items-center justify-between gap-3 border-t border-navy/15 py-3 first:border-t-0">
      <div className="min-w-0">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ember">
          {meatTypeLabel(flavor.meat_type)}
        </p>
        <p className="font-display truncate text-lg font-extrabold uppercase leading-tight tracking-[0.01em] text-navy">
          {flavor.name}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {flavor.sold_out ? (
          <span className="font-mono inline-block border border-ember px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.12em] text-ember">
            Sold out
          </span>
        ) : (
          <span className="font-mono text-sm text-char">
            {formatPrice(flavor.price_cents)}
          </span>
        )}
      </div>
    </li>
  );
}

/** Full flavor row for the /drop board — photo, description, price. */
function FullFlavor({ flavor }: { flavor: DropFlavor }) {
  return (
    <div className="grid gap-5 border border-navy/20 bg-cream p-5 sm:grid-cols-[1fr_1.2fr] sm:items-center">
      <div className="relative">
        <Placeholder label="Flavor photo" ratio="4/3" tone="navy" />
        {flavor.sold_out && <Stamp />}
      </div>
      <div>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ember">
          {meatTypeLabel(flavor.meat_type)}
        </p>
        <h2 className="font-display mt-2 text-3xl font-extrabold uppercase leading-[0.95] tracking-[0.01em] text-navy sm:text-4xl">
          {flavor.name}
        </h2>
        <p className="mt-3 max-w-prose text-char">{flavor.description}</p>
        <p className="font-mono mt-4 text-base text-char">
          {formatPrice(flavor.price_cents)}{" "}
          <span className="text-smoke">/ 3-pack</span>
        </p>
      </div>
    </div>
  );
}

export function DropBoard({
  drop,
  variant,
  className,
}: {
  drop: Drop;
  variant: "condensed" | "full";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const condensed = variant === "condensed";

  return (
    <motion.div
      className={cn(
        "paper-grain border-2 border-navy bg-paper shadow-[6px_6px_0_0_var(--color-navy)]",
        condensed ? "p-4 sm:p-5" : "p-6 sm:p-8",
        className,
      )}
      initial={{
        opacity: 0,
        rotate: reduceMotion ? 0 : -1.5,
        y: reduceMotion ? 0 : 18,
      }}
      whileInView={{ opacity: 1, rotate: 0, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: reduceMotion ? 0.3 : 0.7, ease: EASE }}
    >
      {/* Date-stamp header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy/20 pb-3">
        <span className="font-mono text-xs uppercase tracking-[0.22em] text-navy">
          ★ This Week&apos;s Batch
        </span>
        <span className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
          {drop.week_label}
        </span>
      </div>

      {condensed ? (
        <>
          <ul className="mt-2">
            {drop.flavors.map((flavor) => (
              <CondensedRow key={flavor.id} flavor={flavor} />
            ))}
          </ul>
          <div className="mt-4">
            <Button href="/drop" variant="primary">
              See the full batch
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5">
          {drop.flavors.map((flavor) => (
            <FullFlavor key={flavor.id} flavor={flavor} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
