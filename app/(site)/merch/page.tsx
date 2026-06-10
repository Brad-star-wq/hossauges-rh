import type { Metadata } from "next";
import { Eyebrow } from "@/components/eyebrow";
import { Placeholder } from "@/components/placeholder";
import { getMerch } from "@/lib/queries";
import { formatPrice } from "@/lib/types";

export const metadata: Metadata = {
  title: "Merch",
  description: "Hossauges hats, tees, and hoodies. Checkout handled securely by Square.",
};
export const revalidate = 60;

export default async function MerchPage() {
  // getMerch returns active items only (RLS also enforces this), sorted.
  const items = await getMerch();

  return (
    <div className="paper-grain">
      <section className="container py-16 sm:py-24">
        <Eyebrow>Wear the brand</Eyebrow>
        <h1 className="font-display mt-4 text-5xl font-extrabold uppercase leading-[0.95] text-navy sm:text-7xl">
          Merch
        </h1>
        <p className="mt-4 max-w-md text-lg text-char">
          Hats, tees, and hoodies. Checkout runs through Square.
        </p>

        {items.length === 0 ? (
          <p className="font-display mt-16 text-3xl font-extrabold uppercase text-smoke">
            Merch restock coming soon.
          </p>
        ) : (
          <>
            <ul className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="group flex flex-col border border-navy/15 bg-paper"
                >
                  <div className="overflow-hidden">
                    <Placeholder
                      label="Merch photo"
                      ratio="4/5"
                      tone="cream"
                      className="transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-display text-xl font-bold uppercase leading-tight text-navy">
                      {item.name}
                    </h2>
                    <p className="font-mono mt-1 text-sm text-char">
                      {formatPrice(item.price_cents)}
                      <span className="text-smoke"> · {item.sizes_note}</span>
                    </p>
                    <a
                      href={item.square_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono mt-4 inline-flex items-center justify-center bg-ember-press px-5 py-3 text-xs uppercase tracking-[0.18em] text-cream transition-colors hover:bg-navy"
                    >
                      Buy
                    </a>
                  </div>
                </li>
              ))}
            </ul>
            <p className="font-mono mt-8 text-xs uppercase tracking-[0.18em] text-smoke">
              Checkout is handled securely by Square.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
