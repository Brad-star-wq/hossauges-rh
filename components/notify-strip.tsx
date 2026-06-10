import { NotifyForm } from "@/components/notify-form";
import { cn } from "@/lib/cn";

/** "Get drop alerts" section (navy band) — wraps the wired NotifyForm. */
export function NotifyStrip({
  heading = "Get drop alerts",
  blurb = "One short email when a new drop goes live. No spam, ever.",
  className,
}: {
  heading?: string;
  blurb?: string;
  className?: string;
}) {
  return (
    <section className={cn("bg-navy text-cream", className)}>
      <div className="container grid gap-8 py-16 sm:py-20 md:grid-cols-[1fr_1fr] md:items-center">
        <div>
          <h2 className="font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl">
            {heading}
          </h2>
          <p className="mt-3 max-w-sm text-cream/75">{blurb}</p>
        </div>
        <NotifyForm />
      </div>
    </section>
  );
}
