import { cn } from "@/lib/cn";

/**
 * Angled "SOLD OUT" rubber-stamp overlay in ember. Thuds in via the stamp-in
 * keyframe (collapses to a static stamp under prefers-reduced-motion).
 * Place inside a `relative` container.
 */
export function Stamp({
  label = "Sold out",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-center justify-center",
        className,
      )}
    >
      <span
        aria-label={label}
        role="img"
        style={{ animation: "stamp-in 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both" }}
        className="font-display select-none border-[3px] border-ember px-5 py-1.5 text-3xl font-extrabold uppercase tracking-[0.12em] text-ember sm:text-4xl"
      >
        {label}
      </span>
    </div>
  );
}
