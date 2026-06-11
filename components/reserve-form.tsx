"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { reserveSubmit } from "@/app/actions";
import { type DropFlavor } from "@/lib/types";
import { cn } from "@/lib/cn";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_QTY = 1;
const MAX_QTY = 10;

type Errors = { name?: string; contact?: string; flavor?: string };

/** Looks like an email OR a 10-digit phone number. */
function isValidContact(value: string): boolean {
  if (EMAIL_RE.test(value)) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length === 10;
}

/**
 * Reserve form. Client-side validation for fast feedback, then the
 * reserveSubmit server action is authoritative (re-checks sold-out etc.).
 * Renders the action's typed result inline — never throws.
 */
export function ReserveForm({ flavors }: { flavors: DropFlavor[] }) {
  const selectable = flavors.filter((f) => !f.sold_out);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [flavorId, setFlavorId] = useState(selectable[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  function validate(): Errors {
    const next: Errors = {};
    if (name.trim().length < 2) next.name = "Tell us your name.";
    if (!isValidContact(contact))
      next.contact = "Enter an email or a 10-digit phone number.";
    const chosen = flavors.find((f) => f.id === flavorId);
    if (!chosen || chosen.sold_out)
      next.flavor = "Pick a flavor that's still available.";
    return next;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    startTransition(async () => {
      const res = await reserveSubmit({ name, contact, flavorId, quantity: qty });
      if (res.ok) {
        setSubmitted(true);
        return;
      }
      // Surface server-side field errors (e.g. sold-out caught server-side).
      setErrors({
        name: res.fieldErrors?.name,
        contact: res.fieldErrors?.contact,
        flavor: res.fieldErrors?.flavor,
      });
      setFormError(res.message);
    });
  }

  function setQtyClamped(v: number) {
    setQty(Math.max(MIN_QTY, Math.min(MAX_QTY, v)));
  }

  if (submitted) {
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
          Thanks for reserving — keep an eye on your phone or inbox.
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
        No payment now — we&apos;ll confirm pickup with you directly.
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

        {/* Flavor */}
        <div>
          <label htmlFor="rsv-flavor" className={labelCls}>
            Flavor
          </label>
          <select
            id="rsv-flavor"
            value={flavorId}
            onChange={(e) => setFlavorId(e.target.value)}
            aria-invalid={!!errors.flavor}
            className={cn(fieldCls, "appearance-none", errors.flavor && "border-ember")}
          >
            {flavors.map((f) => (
              <option
                key={f.id}
                value={f.id}
                disabled={f.sold_out}
                className={f.sold_out ? "text-smoke line-through" : undefined}
              >
                {f.name}
                {f.sold_out ? " — SOLD OUT" : ""}
              </option>
            ))}
          </select>
          {errors.flavor && <p role="alert" className={errCls}>{errors.flavor}</p>}
        </div>

        {/* Quantity stepper */}
        <div>
          <span className={labelCls} id="rsv-qty-label">
            How many 3-packs?
          </span>
          <div
            className="mt-2 flex items-center gap-4"
            role="group"
            aria-labelledby="rsv-qty-label"
          >
            <button
              type="button"
              onClick={() => setQtyClamped(qty - 1)}
              disabled={qty <= MIN_QTY}
              aria-label="Decrease quantity"
              className="font-mono flex size-11 items-center justify-center border border-navy/40 text-xl text-navy transition-colors hover:border-ember hover:text-ember disabled:opacity-30"
            >
              −
            </button>
            <span
              className="font-mono min-w-[2ch] text-center text-xl text-char"
              aria-live="polite"
              aria-atomic="true"
            >
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQtyClamped(qty + 1)}
              disabled={qty >= MAX_QTY}
              aria-label="Increase quantity"
              className="font-mono flex size-11 items-center justify-center border border-navy/40 text-xl text-navy transition-colors hover:border-ember hover:text-ember disabled:opacity-30"
            >
              +
            </button>
          </div>
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
