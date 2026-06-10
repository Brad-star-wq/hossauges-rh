"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Eyebrow } from "@/components/eyebrow";

const STEPS = [
  { n: "01", label: "We post", body: "A fresh pair of flavors drops here every week." },
  { n: "02", label: "You reserve", body: "Claim your 3-packs with the form — no payment now." },
  { n: "03", label: "You pick up", body: "We text or email you to set up pickup in Columbia." },
];

export function HowItWorks() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-sage-wash">
      <div className="container py-16 sm:py-24">
        <Eyebrow>How it works</Eyebrow>
        <motion.ul
          className="mt-8 grid gap-5 sm:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={{
            show: { transition: { staggerChildren: reduceMotion ? 0 : 0.12 } },
          }}
        >
          {STEPS.map((step) => (
            <motion.li
              key={step.n}
              className="border border-navy/15 bg-paper p-6"
              variants={{
                hidden: { opacity: 0, y: reduceMotion ? 0 : 24 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <span className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
                {step.n} / {step.label}
              </span>
              <p className="mt-3 text-char">{step.body}</p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
