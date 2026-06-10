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

/** Compact flavor tag for the condensed (home) board. */
function CondensedTag({ flavor }: { flavor: DropFlavor }) {
  return (
    <div className="relative border border-navy/20 bg-cream p-5">
      {flavor.sold_out && <Stamp />}
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ember">
        {meatTypeLabel(flavor.meat_type)}
      </p>
      <h3 className="font-display mt-2 text-2xl font-extrabold uppercase leading-[0.95] tracking-[0.01em] text-navy">
        {flavor.name}
      </h3>
      <p className="font-mono mt-3 text-sm text-char">
        {formatPrice(flavor.price_cents)}{" "}
        <span className="text-smoke">/ 3-pack</span>
      </p>
    </div>
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

  return (
    <motion.div
      className={cn(
        "paper-grain border-2 border-navy bg-paper p-6 shadow-[6px_6px_0_0_var(--color-navy)] sm:p-8",
        className,
      )}
      initial={{
        opacity: 0,
        rotate: reduceMotion ? 0 : -1.5,
        y: reduceMotion ? 0 : 18,
      }}
      whileInView={{ opacity: 1, rotate: 0, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: reduceMotion ? 0.3 : 0.7,
        ease: EASE,
      }}
    >
      {/* Date-stamp header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/20 pb-4">
        <span className="font-mono text-xs uppercase tracking-[0.22em] text-navy">
          ★ The Drop Board
        </span>
        <span className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
          {drop.week_label}
        </span>
      </div>

      {/* Flavor tags */}
      <div
        className={cn(
          "mt-6 grid gap-5",
          variant === "condensed" ? "sm:grid-cols-2" : "grid-cols-1",
        )}
      >
        {drop.flavors.map((flavor) =>
          variant === "condensed" ? (
            <CondensedTag key={flavor.id} flavor={flavor} />
          ) : (
            <FullFlavor key={flavor.id} flavor={flavor} />
          ),
        )}
      </div>

      {variant === "condensed" && (
        <div className="mt-6">
          <Button href="/drop" variant="primary">
            See the full drop
          </Button>
        </div>
      )}
    </motion.div>
  );
}
