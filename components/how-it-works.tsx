const STEPS = [
  { label: "We post", detail: "Two flavors drop weekly" },
  { label: "You reserve", detail: "Claim packs, no payment" },
  { label: "You pick up", detail: "We confirm in Columbia" },
];

/** Slim one-row "how it works" strip. */
export function HowItWorks() {
  return (
    <section className="border-y border-navy/15 bg-sage-wash">
      <ul className="container flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-center sm:gap-0">
        {STEPS.map((step) => (
          <li
            key={step.label}
            className="flex items-baseline gap-2 sm:px-6 sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:border-navy/15"
          >
            <span aria-hidden className="size-1.5 self-center rounded-full bg-ember" />
            <span className="font-mono text-sm font-medium uppercase tracking-[0.1em] text-navy">
              {step.label}
            </span>
            <span className="text-xs text-smoke">— {step.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
