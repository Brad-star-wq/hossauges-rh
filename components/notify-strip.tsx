"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "Get drop alerts" email capture. Visual only this session — submitting just
 * exercises the designed success/error states; wired to email_list in Session 6.
 */
export function NotifyStrip({
  heading = "Get drop alerts",
  blurb = "One short email when a new drop goes live. No spam, ever.",
  className,
}: {
  heading?: string;
  blurb?: string;
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setStatus("error");
      return;
    }
    setStatus("success");
  }

  return (
    <section className={cn("bg-navy text-cream", className)}>
      <div className="container grid gap-8 py-16 sm:py-20 md:grid-cols-[1fr_1fr] md:items-center">
        <div>
          <h2 className="font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl">
            {heading}
          </h2>
          <p className="mt-3 max-w-sm text-cream/75">{blurb}</p>
        </div>

        {status === "success" ? (
          <p
            role="status"
            className="font-mono border border-cream/30 bg-navy-deep px-5 py-4 text-sm uppercase tracking-[0.12em] text-cream"
          >
            ★ You&apos;re on the list — watch your inbox for the next drop.
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
            <label htmlFor="notify-email" className="sr-only">
              Email address
            </label>
            <div className="flex gap-2">
              <input
                id="notify-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="you@email.com"
                aria-invalid={status === "error"}
                className={cn(
                  "min-w-0 flex-1 border bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40",
                  status === "error"
                    ? "border-ember"
                    : "border-cream/30 focus-visible:border-ember",
                )}
              />
              <button
                type="submit"
                className="font-mono shrink-0 bg-ember px-5 py-3 text-xs uppercase tracking-[0.18em] text-cream transition-colors hover:bg-cream hover:text-navy"
              >
                Notify me
              </button>
            </div>
            {status === "error" && (
              <p role="alert" className="font-mono text-xs uppercase tracking-[0.12em] text-ember">
                Enter a valid email address.
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
