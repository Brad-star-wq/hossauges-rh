"use client";

// Shared admin primitives (Dashboard Makeover, Round 2). Callers extend every
// class via cn(), so styling stays here and the pages stay structural. Admin
// uses Archivo (the <body> default) — no font-display/font-mono, no uppercase.

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/** Page title. Archivo 700, ~24px, tight tracking, deep navy. Title only —
 *  there is deliberately no subtitle/description prop (the helper paragraphs
 *  were removed and a prop for them would invite their return). */
export function PageHeader({ title, className }: { title: string; className?: string }) {
  return (
    <h1 className={cn("text-2xl font-bold tracking-tight text-navy-deep", className)}>
      {title}
    </h1>
  );
}

/** Form label: sentence case, body font, small, secondary text. */
export function Label({
  className,
  ...rest
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-xs text-smoke", className)} {...rest} />;
}

const FIELD_BASE =
  "w-full border border-navy/30 bg-paper px-3 py-3 text-base text-char focus-visible:border-ember";

/** Text input. */
export function Field({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_BASE, className)} {...rest} />;
}

/** Auto-sizing textarea — grows to fit its content instead of a fixed `rows`,
 *  so descriptions aren't truncated and short labels don't get a 200px box. */
export function TextArea({
  className,
  value,
  onChange,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      rows={1}
      className={cn(FIELD_BASE, "resize-none overflow-hidden", className)}
      {...rest}
    />
  );
}

/** Select — matches Field, with the native chrome removed. */
export function Select({
  className,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(FIELD_BASE, "appearance-none", className)} {...rest} />;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ember-press text-cream hover:bg-navy",
  secondary: "border-2 border-navy text-navy hover:bg-navy hover:text-cream",
  ghost: "border border-navy/40 text-navy hover:border-ember hover:text-ember",
  danger: "border border-ember/50 text-ember hover:bg-ember hover:text-cream",
};

/** Button. 44px minimum touch target on every variant. */
export function Button({
  variant = "primary",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center px-4 text-sm transition-colors disabled:opacity-60",
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}

/** Bordered paper surface used throughout the admin. */
export function Card({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border border-navy/20 bg-paper p-4", className)} {...rest} />;
}

/** The role="switch" pattern from the sold-out / pre-order toggles. Turns ember
 *  when on. Children are the label(s) laid out left↔right by the caller. */
export function Toggle({
  checked,
  onChange,
  className,
  children,
  ...rest
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex min-h-12 w-full items-center justify-between border-2 px-4 transition-colors",
        checked ? "border-ember bg-ember/10" : "border-navy/30 bg-paper",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** The `{ ok, message }` result line, previously reimplemented in four places.
 *  Navy on success, ember on error. Renders nothing when there's no message. */
export function StatusLine({
  result,
  className,
}: {
  result: { ok: boolean; message: string } | null;
  className?: string;
}) {
  if (!result || !result.message) return null;
  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={cn("text-sm", result.ok ? "text-navy" : "text-ember", className)}
    >
      {result.message}
    </p>
  );
}
