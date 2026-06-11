"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { PreorderForm } from "@/components/preorder-form";
import { type Preorder } from "@/lib/types";

// How often a returning visitor sees the pop-up. "session" = once per browser
// session (sessionStorage); switch to "day" for once per calendar day (localStorage).
const SHOW_MODE: "session" | "day" = "session";
const SEEN_KEY = "hoss_preorder_seen";

function alreadySeen(): boolean {
  try {
    if (SHOW_MODE === "day") {
      return localStorage.getItem(SEEN_KEY) === new Date().toISOString().slice(0, 10);
    }
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    if (SHOW_MODE === "day") localStorage.setItem(SEEN_KEY, new Date().toISOString().slice(0, 10));
    else sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

// Count-aware columns (mirrors preorder-popup-mockup.html). Mobile caps at 2 via CSS.
function colsFor(n: number): number {
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  if (n === 4) return 2;
  return 3;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function PreorderPopup({ popup }: { popup: Preorder }) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"menu" | "form">("menu");
  const modalRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  const active = popup.enabled && popup.items.length > 0;

  // Open once on mount (client-only; depends on sessionStorage).
  useEffect(() => {
    if (!active || alreadySeen()) return;
    markSeen();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time open on mount
    setOpen(true);
  }, [active]);

  // While open: lock scroll, trap focus, close on Esc, restore focus on close.
  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const els = Array.from(modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (els.length === 0) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => {
      modalRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 0);

    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
      document.body.style.overflow = "";
      prevFocus.current?.focus?.();
    };
  }, [open, step]);

  if (!active) return null;

  const cols = colsFor(popup.items.length);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-deep/65 p-5 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false); // click backdrop to close
          }}
        >
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={popup.title || "Pre-order"}
            className="relative max-h-[90svh] w-full max-w-[540px] overflow-y-auto border-2 border-navy bg-paper shadow-[14px_14px_0_rgba(30,51,73,0.18)]"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            transition={{ duration: reduceMotion ? 0.2 : 0.4, ease: EASE }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="font-mono absolute right-3.5 top-3.5 flex size-9 items-center justify-center border border-navy text-navy transition-colors hover:border-ember hover:bg-ember hover:text-cream"
            >
              ✕
            </button>

            {/* Head */}
            <div className="border-b border-dashed border-navy/30 px-8 pb-5 pt-8 sm:px-9">
              <p className="font-mono inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.28em] text-ember">
                <span aria-hidden className="size-1.5 rounded-full bg-ember" />
                Pre-order open
              </p>
              <h2 className="font-display mt-2.5 text-3xl font-extrabold uppercase leading-[0.98] tracking-[0.01em] text-navy sm:text-4xl">
                {popup.title || "Pre-Order"}
              </h2>
            </div>

            {step === "menu" ? (
              <>
                {/* Count-aware item menu */}
                <div
                  className="preorder-grid px-8 pb-4 pt-8 sm:px-9"
                  style={{ "--cols": cols } as React.CSSProperties}
                >
                  {popup.items.map((item) => (
                    <div key={item.id} className="text-center">
                      <div className="flex aspect-square w-full items-center justify-center overflow-hidden border border-navy-deep bg-navy">
                        {item.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.photo_url}
                            alt={item.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-cream/40">
                            Photo
                          </span>
                        )}
                      </div>
                      <p className="font-display mt-2.5 text-[0.8rem] font-bold uppercase leading-tight tracking-[0.02em] text-char">
                        {item.name}
                      </p>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="px-8 pb-8 pt-4 sm:px-9">
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className="font-mono w-full bg-ember px-4 py-4 text-sm uppercase tracking-[0.22em] text-cream transition-colors hover:bg-navy"
                  >
                    Sign up for pre-order
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="font-mono mt-3.5 block w-full text-center text-[0.7rem] uppercase tracking-[0.18em] text-smoke transition-colors hover:text-ember"
                  >
                    ✕&nbsp;&nbsp;Just browsing — close
                  </button>
                </div>
              </>
            ) : (
              <PreorderForm items={popup.items} onDone={() => setOpen(false)} />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
