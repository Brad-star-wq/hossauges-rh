import { cn } from "@/lib/cn";
import { SITE_TEXT_DEFAULTS } from "@/lib/site-text";

// Step labels are structural (not editable); only the detail lines are.
const LABELS = ["We post", "You reserve", "You pick up"] as const;

/** Bordered "How it works" box with numbered steps (homepage right column). */
export function HowItWorks({
  className,
  details,
}: {
  className?: string;
  /** The three editable detail lines, in order. Falls back to the defaults. */
  details?: [string, string, string];
}) {
  const detailLines = details ?? [
    SITE_TEXT_DEFAULTS.home_howitworks_1,
    SITE_TEXT_DEFAULTS.home_howitworks_2,
    SITE_TEXT_DEFAULTS.home_howitworks_3,
  ];
  const STEPS = LABELS.map((label, i) => ({ label, detail: detailLines[i] }));

  return (
    <div className={cn("flex h-full flex-col border-2 border-navy bg-cream p-6 sm:p-8", className)}>
      <h2 className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-navy sm:text-4xl">
        How it works
      </h2>
      <ul className="mt-6 flex flex-col">
        {STEPS.map((step, i) => (
          <li
            key={step.label}
            className="flex gap-5 border-t border-navy/15 py-5 first:border-t-0 first:pt-0"
          >
            <span className="font-mono text-2xl font-bold leading-none text-ember">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="font-mono text-sm font-bold uppercase tracking-[0.14em] text-navy">
                {step.label}
              </p>
              <p className="font-mono mt-1.5 text-sm leading-relaxed text-smoke">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
