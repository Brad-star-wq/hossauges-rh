"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { reserveSubmit } from "@/app/actions";
import { meatTypeLabel, type DropFlavor } from "@/lib/types";
import { cn } from "@/lib/cn";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = { name?: string; contact?: string; items?: string };

/** Looks like an email OR a 10-digit phone number. */
function isValidContact(value: string): boolean {
  if (EMAIL_RE.test(value)) return true;
  return value.replace(/\D/g, "").length === 10;
}

/**
 * Multi-flavor reserve form (Round 9). Each flavor on the board gets its own
 * quantity (default 0; sold-out locked at 0). The customer can order several
 * flavors at once; submit sends ONE combined order. Client-side validation is
 * for fast feedback — the reserveSubmit server action is authoritative.
 *
 * Used on /drop (all flavors) and /flavors/[id] (a single flavor). When there's
 * just one selectable flavor it defaults to qty 1 for a smoother single-flavor page.
 */
export function ReserveForm({ flavors }: { flavors: DropFlavor[] }) {
  const selectable = flavors.filter((f) => !f.sold_out);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [qtys, setQtys] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      flavors.map((f) => [f.id, selectable.length === 1 && !f.sold_out ? 1 : 0]),
    ),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [reserved, setReserved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setQty(id: string, value: number) {
    setQtys((prev) => ({ ...prev, [id]: Math.max(0, Math.floor(value) || 0) }));
  }

  function chosenItems() {
    return flavors
      .filter((f) => (qtys[f.id] ?? 0) > 0)
      .map((f) => ({ flavor: f, quantity: qtys[f.id] }));
  }

  function validate(): Errors {
    const next: Errors = {};
    if (name.trim().length < 2) next.name = "Tell us your name.";
    if (!isValidContact(contact))
      next.contact = "Enter an email or a 10-digit phone number.";
    if (chosenItems().length === 0)
      next.items = "Add a quantity to at least one flavor.";
    return next;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const items = flavors.map((f) => ({ flavorId: f.id, quantity: qtys[f.id] ?? 0 }));
    const summary = chosenItems()
      .map((i) => `${i.flavor.name} ×${i.quantity}`)
      .join(", ");

    startTransition(async () => {
      const res = await reserveSubmit({ name, contact, items });
      if (res.ok) {
        setReserved(summary);
        return;
      }
      setErrors({
        name: res.fieldErrors?.name,
        contact: res.fieldErrors?.contact,
        items: res.fieldErrors?.items,
      });
      setFormError(res.message);
    });
  }

  if (reserved) {
    return (
      <motion.div
        role="status"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-2 border-navy bg-paper p-8 text-center"
      >
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
          ★ You&apos;re on the list
        </p>
        <p className="font-display mt-3 text-3xl font-extrabold uppercase leading-[0.95] text-navy">
          We&apos;ll reach out to confirm pickup.
        </p>
        <p className="mt-3 text-char">
          You reserved <span className="font-mono text-navy">{reserved}</span>. Keep
          an eye on your phone or inbox.
        </p>
      </motion.div>
    );
  }

  const labelCls = "font-mono block text-xs uppercase tracking-[0.18em] text-navy";
  const fieldCls =
    "mt-2 w-full border border-navy/30 bg-paper px-4 py-3 text-base text-char focus-visible:border-ember";
  const errCls = "font-mono mt-1 text-xs uppercase tracking-[0.1em] text-ember";

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label="Reserve your packs"
      className="border border-navy/20 bg-paper p-6 sm:p-8"
    >
      <h2 className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-navy">
        Reserve your packs
      </h2>
      <p className="mt-2 text-sm text-smoke">
        Set how many 3-packs of each flavor you want — no payment now, we&apos;ll
        confirm pickup with you directly.
      </p>

      <div className="mt-6 grid gap-5">
        {/* Name */}
        <div>
          <label htmlFor="rsv-name" className={labelCls}>
            Your name
          </label>
          <input
            id="rsv-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name}
            className={cn(fieldCls, errors.name && "border-ember")}
          />
          {errors.name && <p role="alert" className={errCls}>{errors.name}</p>}
        </div>

        {/* Contact */}
        <div>
          <label htmlFor="rsv-contact" className={labelCls}>
            How do we reach you?
          </label>
          <input
            id="rsv-contact"
            type="text"
            inputMode="email"
            placeholder="Email or phone"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            aria-invalid={!!errors.contact}
            className={cn(fieldCls, errors.contact && "border-ember")}
          />
          {errors.contact && <p role="alert" className={errCls}>{errors.contact}</p>}
        </div>

        {/* Per-flavor quantities */}
        <div>
          <span className={labelCls}>Flavors &amp; quantities</span>
          <ul className="mt-2 flex flex-col divide-y divide-navy/10 border border-navy/20">
            {flavors.map((f) => {
              const qty = qtys[f.id] ?? 0;
              return (
                <li
                  key={f.id}
                  className={cn(
                    "flex items-center justify-between gap-3 p-3",
                    f.sold_out && "opacity-60",
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-display truncate text-lg font-bold uppercase leading-tight text-navy">
                      {f.name}
                    </p>
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-smoke">
                      {f.sold_out ? "Sold out" : meatTypeLabel(f.meat_type)}
                    </p>
                  </div>

                  {f.sold_out ? (
                    <span className="font-mono shrink-0 text-[0.6rem] uppercase tracking-[0.16em] text-ember">
                      ★ Sold out
                    </span>
                  ) : (
                    <div
                      className="flex shrink-0 items-center gap-3"
                      role="group"
                      aria-label={`Quantity of ${f.name}`}
                    >
                      <button
                        type="button"
                        onClick={() => setQty(f.id, qty - 1)}
                        disabled={qty <= 0}
                        aria-label={`Decrease ${f.name}`}
                        className="font-mono flex size-10 items-center justify-center border border-navy/40 text-xl text-navy transition-colors hover:border-ember hover:text-ember disabled:opacity-30"
                      >
                        −
                      </button>
                      <span
                        className="font-mono min-w-[2ch] text-center text-lg text-char"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(f.id, qty + 1)}
                        aria-label={`Increase ${f.name}`}
                        className="font-mono flex size-10 items-center justify-center border border-navy/40 text-xl text-navy transition-colors hover:border-ember hover:text-ember"
                      >
                        +
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {errors.items && <p role="alert" className={errCls}>{errors.items}</p>}
        </div>

        {formError && (
          <p role="alert" className={errCls}>
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="font-mono mt-2 w-full bg-ember-press px-6 py-4 text-xs uppercase tracking-[0.18em] text-cream transition-colors hover:bg-navy disabled:opacity-60"
        >
          {pending ? "Reserving…" : "Reserve my packs"}
        </button>
      </div>
    </form>
  );
}
