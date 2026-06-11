import { Eyebrow } from "@/components/eyebrow";
import { type ArchiveFlavor, type MeatType, meatTypeLabel } from "@/lib/types";

function ChipGroup({ label, items }: { label: string; items: ArchiveFlavor[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ember">{label}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((f) => (
          <li
            key={f.name}
            className="font-mono border border-navy/20 bg-cream px-3 py-1 text-xs uppercase tracking-[0.08em] text-navy"
          >
            {f.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Contained "every flavor we've made" card (replaces the old marquee stripe).
 * Styled like the batch board; chips wrapped + grouped by meat type.
 */
export function FlavorBox({ flavors }: { flavors: ArchiveFlavor[] }) {
  const group = (t: MeatType) => flavors.filter((f) => f.meat_type === t);
  return (
    <div className="paper-grain border-2 border-navy bg-paper p-6 shadow-[6px_6px_0_0_var(--color-navy)] sm:p-8">
      <Eyebrow>The archive</Eyebrow>
      <h2 className="font-display mt-3 text-3xl font-extrabold uppercase leading-[0.95] text-navy sm:text-4xl">
        Every flavor we&apos;ve made
      </h2>
      <div className="mt-6 flex flex-col gap-5">
        <ChipGroup label={meatTypeLabel("pork")} items={group("pork")} />
        <ChipGroup label={meatTypeLabel("beef_pork")} items={group("beef_pork")} />
      </div>
    </div>
  );
}
