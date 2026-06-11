import { cn } from "@/lib/cn";

const STEPS = [
  { label: "We post", detail: "Two new flavors drop every week." },
  { label: "You reserve", detail: "Claim your packs — no payment up front." },
  { label: "You pick up", detail: "We confirm a pickup time in Columbia." },
];

/** Bordered "How it works" box with numbered steps (homepage right column). */
export function HowItWorks({ className }: { className?: string }) {
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
