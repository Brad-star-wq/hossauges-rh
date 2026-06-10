"use client";

import { useState, useTransition } from "react";
import { notifySubmit } from "@/app/actions";
import { cn } from "@/lib/cn";

/**
 * "Get drop alerts" email capture, wired to the notifySubmit server action.
 * Designed for dark sections (navy / navy-deep). Shows the action's typed
 * message inline — duplicates come back as a friendly success.
 */
export function NotifyForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await notifySubmit({ email });
      setResult({ ok: res.ok, message: res.message });
      if (res.ok) setEmail("");
    });
  }

  if (result?.ok) {
    return (
      <p
        role="status"
        className={cn(
          "font-mono border border-cream/30 bg-navy-deep px-5 py-4 text-sm uppercase tracking-[0.12em] text-cream",
          className,
        )}
      >
        ★ {result.message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className={cn("flex flex-col gap-2", className)}>
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
            if (result) setResult(null);
          }}
          placeholder="you@email.com"
          aria-invalid={result ? !result.ok : undefined}
          className={cn(
            "min-w-0 flex-1 border bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40",
            result && !result.ok ? "border-ember" : "border-cream/30 focus-visible:border-ember",
          )}
        />
        <button
          type="submit"
          disabled={pending}
          className="font-mono shrink-0 bg-ember px-5 py-3 text-xs uppercase tracking-[0.18em] text-cream transition-colors hover:bg-cream hover:text-navy disabled:opacity-60"
        >
          {pending ? "…" : "Notify me"}
        </button>
      </div>
      {result && !result.ok && (
        <p role="alert" className="font-mono text-xs uppercase tracking-[0.12em] text-ember">
          {result.message}
        </p>
      )}
    </form>
  );
}
