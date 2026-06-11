"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { EASE } from "@/lib/motion";
import { Button } from "@/components/button";

const LINES = [["Small-batch", "sausage."], ["Columbia,", "SC."]];

export function Hero({ photoUrl }: { photoUrl?: string | null }) {
  const reduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduceMotion ? 0 : 0.12, delayChildren: 0.1 },
    },
  };
  const word: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : "0.6em" },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: EASE },
    },
  };

  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden">
      {/* Full-bleed photo: DB image when set, else styled placeholder. */}
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div role="img" aria-label="Hero photo — dark grill" className="absolute inset-0 bg-navy-deep">
          <span className="font-mono absolute bottom-4 right-4 text-[0.6rem] uppercase tracking-[0.25em] text-cream/70">
            Hero photo
          </span>
        </div>
      )}
      {/* Navy-deep overlay */}
      <div className="absolute inset-0 bg-navy-deep/70" />

      <div className="container relative py-20">
        <motion.h1
          className="font-display max-w-4xl text-cream"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {LINES.map((line, li) => (
            <span key={li} className="block overflow-hidden">
              <span className="flex flex-wrap gap-x-4 text-[clamp(3rem,12vw,6.5rem)] font-extrabold uppercase leading-[0.9] tracking-[0.01em]">
                {line.map((w, wi) => (
                  <motion.span key={wi} variants={word} className="inline-block">
                    {w}
                  </motion.span>
                ))}
              </span>
            </span>
          ))}
        </motion.h1>

        <motion.p
          className="mt-6 max-w-md text-lg text-cream/85"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.7, duration: 0.6 }}
        >
          Two friends, a smoker, and a new pair of flavors every week.
        </motion.p>

        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.85, duration: 0.6 }}
        >
          <Button href="/drop" variant="primary">
            See this week&apos;s batch
          </Button>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.span
        className="font-mono absolute bottom-6 left-1/2 -translate-x-1/2 text-[0.6rem] uppercase tracking-[0.3em] text-cream/75"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduceMotion ? 0 : 1.1, duration: 0.6 }}
      >
        Scroll ↓
      </motion.span>
    </section>
  );
}
