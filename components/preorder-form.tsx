"use client";

import { useState, useTransition } from "react";
import { preorderSubmit } from "@/app/actions";
import { type PreorderItem } from "@/lib/types";
import { cn } from "@/lib/cn";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validContact(v: string) {
  return EMAIL_RE.test(v) || v.replace(/\D/g, "").length === 10;
}

/** Pre-order signup form — second step inside the pop-up modal. */
export function PreorderForm({
  items,
  onDone,
}: {
  items: PreorderItem[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ name?: string; contact?: string; items?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function toggle(itemName: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(itemName)) next.delete(itemName);
      else next.add(itemName);
      return next;
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = "Tell us your name.";
    if (!validContact(contact)) next.contact = "Enter an email or 10-digit phone.";
    if (picked.size === 0) next.items = "Pick at least one item.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const itemsStr = [...picked].join(", ") + (note.trim() ? ` — ${note.trim()}` : "");
    start(async () => {
      try {
        const res = await preorderSubmit({ name, contact, items: itemsStr });
        if (res.ok) {
          setDone(true);
          return;
        }
        setErrors({
          name: res.fieldErrors?.name,
          contact: res.fieldErrors?.contact,
          items: res.fieldErrors?.items,
        });
        setFormError(res.message);
      } catch (err) {
        setFormError(err instanceof Error ? `Couldn't submit: ${err.message}` : "Couldn't submit.");
      }
    });
  }

  if (done) {
    return (
      <div className="px-8 py-10 text-center sm:px-9">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">★ You&apos;re on the list</p>
        <p className="font-display mt-3 text-3xl font-extrabold uppercase leading-[0.95] text-navy">
          We&apos;ll be in touch.
        </p>
        <p className="mt-3 text-char">Thanks for pre-ordering — keep an eye on your phone or inbox.</p>
        <button
          type="button"
          onClick={onDone}
          className="font-mono mt-6 border border-navy/40 px-5 py-3 text-xs uppercase tracking-[0.18em] text-navy transition-colors hover:border-ember hover:text-ember"
        >
          Close
        </button>
      </div>
    );
  }

  const labelCls = "font-mono block text-xs uppercase tracking-[0.18em] text-navy";
  const fieldCls =
    "mt-2 w-full border border-navy/30 bg-paper px-4 py-3 text-base text-char focus-visible:border-ember";
  const errCls = "font-mono mt-1 text-xs uppercase tracking-[0.1em] text-ember";

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Pre-order signup" className="flex flex-col gap-5 px-8 py-7 sm:px-9">
      <div>
        <label htmlFor="po-name" className={labelCls}>Your name</label>
        <input id="po-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name}
          className={cn(fieldCls, errors.name && "border-ember")} />
        {errors.name && <p role="alert" className={errCls}>{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="po-contact" className={labelCls}>How do we reach you?</label>
        <input id="po-contact" inputMode="email" placeholder="Email or phone" value={contact}
          onChange={(e) => setContact(e.target.value)} aria-invalid={!!errors.contact}
          className={cn(fieldCls, errors.contact && "border-ember")} />
        {errors.contact && <p role="alert" className={errCls}>{errors.contact}</p>}
      </div>

      <div>
        <span className={labelCls}>Which would you like?</span>
        <ul className="mt-2 flex flex-col gap-1">
          {items.map((it) => (
            <li key={it.id}>
              <label className="flex min-h-11 items-center gap-3">
                <input type="checkbox" checked={picked.has(it.name)} onChange={() => toggle(it.name)}
                  className="size-5 accent-[var(--color-ember)]" />
                <span className="text-char">{it.name}</span>
              </label>
            </li>
          ))}
        </ul>
        {errors.items && <p role="alert" className={errCls}>{errors.items}</p>}
      </div>

      <div>
        <label htmlFor="po-note" className={labelCls}>Quantity / notes (optional)</label>
        <input id="po-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 2 packs of each"
          className={fieldCls} />
      </div>

      {formError && <p role="alert" className={errCls}>{formError}</p>}

      <button type="submit" disabled={pending}
        className="font-mono w-full bg-ember-press px-6 py-4 text-xs uppercase tracking-[0.2em] text-cream transition-colors hover:bg-navy disabled:opacity-60">
        {pending ? "Sending…" : "Submit pre-order"}
      </button>
    </form>
  );
}
