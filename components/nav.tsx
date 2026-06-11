"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/drop", label: "Batch" },
  { href: "/flavors", label: "Flavors" },
  { href: "/merch", label: "Merch" },
  { href: "/about", label: "About" },
];

function Wordmark({ onClick, dark }: { onClick?: () => void; dark?: boolean }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="Hossauges — home"
      className={cn(
        "font-display text-2xl font-extrabold uppercase tracking-[0.04em]",
        dark ? "text-cream" : "text-navy",
      )}
    >
      Hoss<span className="text-ember">auges</span>
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  // Lock the page behind the menu + close on Escape while open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-navy/10 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80">
        <nav className="container flex h-16 items-center justify-between">
          <Wordmark />

          {/* Desktop links */}
          <ul className="hidden items-center gap-8 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "font-mono text-xs uppercase tracking-[0.18em] transition-colors hover:text-ember",
                    isActive(link.href) ? "text-ember" : "text-char",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile trigger */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="font-mono text-xs uppercase tracking-[0.18em] text-char md:hidden"
          >
            Menu
          </button>
        </nav>
      </header>

      {/*
        Rendered as a SIBLING of the header (not inside it). The header has
        backdrop-filter, which would otherwise become the containing block for
        this fixed overlay and shrink it to the header's height. As a sibling its
        containing block is the viewport, so it truly covers the full screen.
      */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col bg-navy-deep text-cream md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="container flex h-16 shrink-0 items-center justify-between">
              <Wordmark dark onClick={() => setOpen(false)} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="font-mono text-xs uppercase tracking-[0.18em] text-cream"
              >
                Close
              </button>
            </div>

            <motion.ul
              className="container mt-6 flex flex-col gap-1"
              initial="hidden"
              animate="show"
              variants={{
                show: { transition: { staggerChildren: reduceMotion ? 0 : 0.07 } },
              }}
            >
              {LINKS.map((link) => (
                <motion.li
                  key={link.href}
                  variants={{
                    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
                    show: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "font-display block border-b border-cream/10 py-4 text-3xl font-extrabold uppercase tracking-[0.02em] transition-colors hover:text-ember",
                      isActive(link.href) ? "text-ember" : "text-cream",
                    )}
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
