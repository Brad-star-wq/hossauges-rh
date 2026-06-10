"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { voteFlavor } from "@/app/actions";
import { type ArchiveFlavor, type MeatType } from "@/lib/types";
import { StarStripeDivider } from "@/components/star-stripe-divider";
import { cn } from "@/lib/cn";

const VOTE_KEY = (name: string) =>
  `hoss_voted_${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

// A tiny store over a localStorage key — SSR snapshot is always false, so the
// server HTML matches first client paint, then React reconciles. No effect.
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function useHasVoted(name: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(VOTE_KEY(name)) !== null,
    () => false,
  );
}

function FlavorCard({ flavor }: { flavor: ArchiveFlavor }) {
  const reduceMotion = useReducedMotion();
  const persistedVote = useHasVoted(flavor.name);
  const [justVoted, setJustVoted] = useState(false);
  const [, startTransition] = useTransition();

  const voted = persistedVote || justVoted;
  const votes = flavor.votes + (justVoted ? 1 : 0); // optimistic; reconciles on revalidate

  function vote() {
    if (voted) return;
    // Optimistic + localStorage de-dupe, then persist via the server action.
    try {
      localStorage.setItem(VOTE_KEY(flavor.name), "1");
    } catch {
      /* ignore storage failures */
    }
    setJustVoted(true);
    startTransition(async () => {
      const res = await voteFlavor({ name: flavor.name });
      if (!res.ok) {
        // Roll back so the user can try again.
        try {
          localStorage.removeItem(VOTE_KEY(flavor.name));
        } catch {
          /* ignore */
        }
        setJustVoted(false);
      }
    });
  }

  return (
    <motion.li
      className="group flex flex-col justify-between border border-navy/20 bg-paper p-5 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-ember"
      variants={{
        hidden: { opacity: 0, y: reduceMotion ? 0 : 24 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div>
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ember">
          Made ×{flavor.made_count}
        </span>
        <h3 className="font-display mt-2 text-2xl font-extrabold uppercase leading-[0.95] tracking-[0.01em] text-navy">
          {flavor.name}
        </h3>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-smoke">
          {votes} {votes === 1 ? "vote" : "votes"}
        </span>
        <button
          type="button"
          onClick={vote}
          disabled={voted}
          aria-pressed={voted}
          className={cn(
            "font-mono rounded-full border px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.16em] transition-colors",
            voted
              ? "border-navy/20 text-smoke"
              : "border-navy/40 text-navy hover:border-ember hover:bg-ember hover:text-cream",
          )}
        >
          {voted ? "★ Voted" : "Want it back?"}
        </button>
      </div>
    </motion.li>
  );
}

function Group({
  title,
  flavors,
}: {
  title: string;
  flavors: ArchiveFlavor[];
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div>
      <h2 className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-navy sm:text-4xl">
        {title}
      </h2>
      <StarStripeDivider className="mt-4 max-w-xs" />
      <motion.ul
        className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        variants={{
          show: { transition: { staggerChildren: reduceMotion ? 0 : 0.07 } },
        }}
      >
        {flavors.map((f) => (
          <FlavorCard key={f.name} flavor={f} />
        ))}
      </motion.ul>
    </div>
  );
}

export function FlavorArchive({ flavors }: { flavors: ArchiveFlavor[] }) {
  const byType = (t: MeatType) => flavors.filter((f) => f.meat_type === t);
  return (
    <div className="flex flex-col gap-16">
      <Group title="100% Pork" flavors={byType("pork")} />
      <Group title="Beef & Pork Mix" flavors={byType("beef_pork")} />
    </div>
  );
}
