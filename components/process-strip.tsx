"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { Placeholder } from "@/components/placeholder";

// Real process order — the sequence (and its numbering) is earned.
const STEPS = ["Grind", "Stuff", "Smoke", "Pack"];

export function ProcessStrip() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.ol
      className="grid grid-cols-2 gap-5 sm:grid-cols-4"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      variants={{
        show: { transition: { staggerChildren: reduceMotion ? 0 : 0.1 } },
      }}
    >
      {STEPS.map((step, i) => (
        <motion.li
          key={step}
          variants={{
            hidden: { opacity: 0, y: reduceMotion ? 0 : 24 },
            show: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <Placeholder label={`${step} photo`} ratio="1/1" tone="navy" />
          <p className="font-mono mt-3 text-xs uppercase tracking-[0.2em] text-navy">
            {String(i + 1).padStart(2, "0")} / {step}
          </p>
        </motion.li>
      ))}
    </motion.ol>
  );
}
