"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/drop", label: "Drop" },
  { href: "/flavors", label: "Flavors" },
  { href: "/merch", label: "Merch" },
  { href: "/about", label: "About" },
];

function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="Hossauges — home"
      className="font-display text-2xl font-extrabold uppercase tracking-[0.04em] text-navy"
    >
      Hoss<span className="text-ember">auges</span>
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  // Lock scroll + close on Escape while the overlay is open.
  // (Nav links and the wordmark close it via their own onClick handlers.)
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
    <header className="sticky top-0 z-50 border-b border-navy/10 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80">
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

      {/* Mobile full-screen overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col bg-navy-deep text-cream md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="container flex h-16 items-center justify-between">
              <span className="font-display text-2xl font-extrabold uppercase tracking-[0.04em] text-cream">
                Hoss<span className="text-ember">auges</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="font-mono text-xs uppercase tracking-[0.18em]"
              >
                Close
              </button>
            </div>

            <motion.ul
              className="container mt-8 flex flex-col gap-2"
              initial="hidden"
              animate="show"
              variants={{
                show: {
                  transition: { staggerChildren: reduceMotion ? 0 : 0.08 },
                },
              }}
            >
              {LINKS.map((link) => (
                <motion.li
                  key={link.href}
                  variants={{
                    hidden: { opacity: 0, y: reduceMotion ? 0 : 16 },
                    show: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "font-display block py-2 text-5xl font-extrabold uppercase tracking-[0.02em] transition-colors hover:text-ember",
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
    </header>
  );
}
