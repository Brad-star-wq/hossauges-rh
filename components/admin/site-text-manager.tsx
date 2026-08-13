"use client";

import { useMemo, useState, useTransition } from "react";
import { saveSiteText } from "@/app/admin/actions";
import { cn } from "@/lib/cn";
import {
  PageHeader,
  Label,
  Field,
  TextArea,
  Button,
  Toggle,
  StatusLine,
} from "@/components/admin/ui";
import {
  SITE_TEXT_DEFAULTS,
  SITE_TEXT_FIELDS,
  ANNOUNCEMENT_ON,
  type SiteText,
  type SiteTextField,
  type SiteTextGroup,
} from "@/lib/site-text";

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
      <PageHeader title="Site Text" />

      {grouped.map(({ group, fields }) => (
        <section key={group} className="border-2 border-navy bg-paper p-4">
          <h2 className="text-base font-bold text-navy-deep">{group}</h2>
          <div className="mt-4 flex flex-col gap-5">
            {fields.map((field) => {
              const value = form[field.key] ?? "";

              // Announcement on/off switch.
              if (field.control === "toggle") {
                const on = value === ANNOUNCEMENT_ON;
                return (
                  <div key={field.key}>
                    <Label>{field.label}</Label>
                    <Toggle
                      checked={on}
                      onChange={(next) => set(field.key, next ? ANNOUNCEMENT_ON : "")}
                      className="mt-1"
                    >
                      <span className="text-sm text-navy">
                        {on ? "On — bar is showing" : "Off — bar hidden"}
                      </span>
                      <span className="text-xs text-smoke">tap to {on ? "hide" : "show"}</span>
                    </Toggle>
                  </div>
                );
              }

              const over = field.softMax != null && value.length > field.softMax;
              return (
                <div key={field.key}>
                  <Label htmlFor={`st-${field.key}`}>{field.label}</Label>
                  {field.control === "textarea" ? (
                    <TextArea
                      id={`st-${field.key}`}
                      value={value}
                      onChange={(e) => set(field.key, e.target.value)}
                      placeholder={placeholderFor(field)}
                      className="mt-1"
                    />
                  ) : (
                    <Field
                      id={`st-${field.key}`}
                      value={value}
                      onChange={(e) => set(field.key, e.target.value)}
                      placeholder={placeholderFor(field)}
                      className="mt-1"
                    />
                  )}
                  {field.softMax != null && (
                    <div className="mt-1 flex justify-end">
                      <span className={cn("text-xs tabular-nums", over ? "text-ember" : "text-smoke")}>
                        {value.length}/{field.softMax}
                        {over ? " · may overflow" : ""}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <StatusLine result={result} />

      {/* Sticky save so it's always reachable on a phone. */}
      <div className="sticky bottom-4 z-10">
        <Button
          type="button"
          variant="primary"
          onClick={onSave}
          disabled={pending}
          className="min-h-12 w-full py-3 shadow-[4px_4px_0_0_var(--color-navy)]"
        >
          {pending ? "Saving…" : "Save all changes"}
        </Button>
      </div>
    </div>
  );
}
