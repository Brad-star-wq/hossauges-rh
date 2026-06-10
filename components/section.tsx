"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

/**
 * Section wrapper: vertical rhythm + a reveal-once scroll animation
 * (fade + 24px rise). Honors prefers-reduced-motion (collapses to a fade).
 */
export function Section({
  children,
  className,
  containerClassName,
  as = "section",
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  as?: "section" | "div";
}) {
  const reduceMotion = useReducedMotion();
  const MotionTag = as === "div" ? motion.div : motion.section;

  return (
    <MotionTag
      className={cn("py-16 sm:py-24", className)}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className={cn("container", containerClassName)}>{children}</div>
    </MotionTag>
  );
}
