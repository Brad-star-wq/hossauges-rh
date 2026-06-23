"use client";

import { useMemo, useState, useTransition } from "react";
import { saveSiteText } from "@/app/admin/actions";
import { cn } from "@/lib/cn";
import {
  SITE_TEXT_DEFAULTS,
  SITE_TEXT_FIELDS,
  ANNOUNCEMENT_ON,
  type SiteText,
  type SiteTextField,
  type SiteTextGroup,
} from "@/lib/site-text";

const labelCls = "font-mono block text-[0.65rem] uppercase tracking-[0.18em] text-navy";
const fieldCls =
  "mt-1 w-full border border-navy/30 bg-paper px-3 py-3 text-base text-char focus-visible:border-ember";

const GROUP_ORDER: SiteTextGroup[] = ["Home", "Batch", "About", "Footer", "Announcement"];

function placeholderFor(field: SiteTextField): string {
  const def = SITE_TEXT_DEFAULTS[field.key];
  if (def) return def;
  if (field.key === "announcement_text") return "e.g. Pickup this Saturday!";
  return "";
}

export function SiteTextManager({ values }: { values: SiteText }) {
  // Start from the RAW stored values (empty stays empty) so a blank field shows
  // its default as placeholder — emptying + saving reverts to the default.
  const [form, setForm] = useState<SiteText>(values);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const grouped = useMemo(() => {
    const by = new Map<SiteTextGroup, SiteTextField[]>();
    for (const f of SITE_TEXT_FIELDS) {
      const list = by.get(f.group) ?? [];
      list.push(f);
      by.set(f.group, list);
    }
    return GROUP_ORDER.filter((g) => by.has(g)).map((g) => ({ group: g, fields: by.get(g)! }));
  }, []);

  function set(key: keyof SiteText, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (result) setResult(null);
  }

  function onSave() {
    setResult(null);
    start(async () => {
      try {
        const res = await saveSiteText(form);
        setResult({ ok: res.ok, message: res.message });
      } catch (err) {
        setResult({
          ok: false,
          message: err instanceof Error ? err.message : "Save failed — server error.",
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-navy">
          Site Text
        </h1>
        <p className="font-mono mt-2 text-[0.65rem] uppercase tracking-[0.14em] text-smoke">
          Edit the words on the site. Leave a field blank to use the built-in default.
        </p>
      </div>

      {grouped.map(({ group, fields }) => (
        <section key={group} className="border-2 border-navy bg-paper p-4">
          <h2 className="font-display text-lg font-bold uppercase leading-tight text-navy">
            {group}
          </h2>
          <div className="mt-4 flex flex-col gap-5">
            {fields.map((field) => {
              const value = form[field.key] ?? "";

              // Announcement on/off switch.
              if (field.control === "toggle") {
                const on = value === ANNOUNCEMENT_ON;
                return (
                  <div key={field.key}>
                    <span className={labelCls}>{field.label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      onClick={() => set(field.key, on ? "" : ANNOUNCEMENT_ON)}
                      className={cn(
                        "mt-1 flex min-h-12 w-full items-center justify-between border-2 px-4 transition-colors",
                        on ? "border-ember bg-ember/10" : "border-navy/30 bg-paper",
                      )}
                    >
                      <span className="font-mono text-xs uppercase tracking-[0.16em] text-navy">
                        {on ? "On — bar is showing" : "Off — bar hidden"}
                      </span>
                      <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-smoke">
                        tap to {on ? "hide" : "show"}
                      </span>
                    </button>
                    <p className="font-mono mt-1 text-[0.6rem] uppercase tracking-[0.1em] text-smoke">
                      {field.where}
                    </p>
                  </div>
                );
              }

              const over = field.softMax != null && value.length > field.softMax;
              return (
                <div key={field.key}>
                  <label className={labelCls} htmlFor={`st-${field.key}`}>
                    {field.label}
                  </label>
                  {field.control === "textarea" ? (
                    <textarea
                      id={`st-${field.key}`}
                      value={value}
                      onChange={(e) => set(field.key, e.target.value)}
                      placeholder={placeholderFor(field)}
                      rows={4}
                      className={cn(fieldCls, "resize-y")}
                    />
                  ) : (
                    <input
                      id={`st-${field.key}`}
                      value={value}
                      onChange={(e) => set(field.key, e.target.value)}
                      placeholder={placeholderFor(field)}
                      className={fieldCls}
                    />
                  )}
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-smoke">
                      {field.where}
                    </p>
                    {field.softMax != null && (
                      <span
                        className={cn(
                          "font-mono text-[0.6rem] tabular-nums",
                          over ? "text-ember" : "text-smoke",
                        )}
                      >
                        {value.length}/{field.softMax}
                        {over ? " · may overflow" : ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {result && (
        <p
          role={result.ok ? "status" : "alert"}
          className={cn(
            "font-mono text-xs uppercase tracking-[0.12em]",
            result.ok ? "text-navy" : "text-ember",
          )}
        >
          {result.ok ? "★ " : ""}
          {result.message}
        </p>
      )}

      {/* Sticky save so it's always reachable on a phone. */}
      <div className="sticky bottom-4 z-10">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="font-mono min-h-12 w-full bg-ember px-4 py-3 text-xs uppercase tracking-[0.18em] text-cream shadow-[4px_4px_0_0_var(--color-navy)] transition-colors hover:bg-navy disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save all changes"}
        </button>
      </div>
    </div>
  );
}
