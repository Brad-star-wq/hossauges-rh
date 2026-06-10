import { cn } from "@/lib/cn";

/** Mono, uppercase, wide-tracked label with an ember dot prefix. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-smoke",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-ember" />
      {children}
    </span>
  );
}
