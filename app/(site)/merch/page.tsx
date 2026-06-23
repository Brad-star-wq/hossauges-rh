import type { Metadata } from "next";
import { Eyebrow } from "@/components/eyebrow";
import { Placeholder } from "@/components/placeholder";
import { getSquareMerch, type SquareMerchItem } from "@/lib/square";
import { formatPrice } from "@/lib/types";

export const metadata: Metadata = {
  title: "Merch",
  description: "Hossauges hats, tees, and hoodies. Checkout handled securely by Square.",
};

// Live from Square, cached ~60s. Editing an item in Square reflects here within
// about a minute.
export const revalidate = 60;

function priceLabel(item: SquareMerchItem): string {
  if (item.priceCents == null) return "$—";
  return item.multiPrice
    ? `From ${formatPrice(item.priceCents)}`
    : formatPrice(item.priceCents);
}

/** One size: a Buy link when available, a disabled sold-out pill otherwise. */
function SizeButton({
  label,
  href,
  soldOut,
}: {
  label: string;
  href: string | null;
  soldOut: boolean;
}) {
  const base =
    "font-mono inline-flex min-h-11 items-center justify-center px-4 text-xs uppercase tracking-[0.16em] transition-colors";
  if (soldOut || !href) {
    return (
      <span
        aria-disabled
        className={`${base} cursor-not-allowed border border-navy/20 text-smoke line-through`}
      >
        {label}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} bg-ember-press text-cream hover:bg-navy`}
    >
      {label}
    </a>
  );
}

function MerchCard({ item }: { item: SquareMerchItem }) {
  // A single unnamed variation ("Regular") → one plain Buy button, no size row.
  const single =
    item.variations.length === 1 &&
    /^(regular|default)$/i.test(item.variations[0].name);

  return (
    <li className="group flex flex-col border border-navy/15 bg-paper">
      <div className="relative overflow-hidden">
        {item.imageUrl ? (
          // Square hosts merch images on S3; plain <img> matches the rest of the
          // site and keeps the 4/5 ratio so there's zero layout shift.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <Placeholder
            label="Merch photo"
            ratio="4/5"
            tone="cream"
            className="transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
        {item.soldOut && (
          <span className="font-mono absolute left-3 top-3 bg-ember px-2 py-1 text-[0.6rem] uppercase tracking-[0.18em] text-cream">
            Sold out
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-display text-xl font-bold uppercase leading-tight text-navy">
          {item.name}
        </h2>
        <p className="font-mono mt-1 text-sm text-char">{priceLabel(item)}</p>

        {item.soldOut ? (
          <p className="font-mono mt-4 text-xs uppercase tracking-[0.18em] text-smoke">
            Sold out
          </p>
        ) : single ? (
          <div className="mt-4">
            <SizeButton
              label="Buy"
              href={item.variations[0].checkoutUrl}
              soldOut={item.variations[0].soldOut}
            />
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.variations.map((v) => (
              <SizeButton
                key={v.id}
                label={v.name}
                href={v.checkoutUrl}
                soldOut={v.soldOut}
              />
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

export default async function MerchPage() {
  const result = await getSquareMerch();

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

        {!result.ok ? (
          <p className="font-display mt-16 text-3xl font-extrabold uppercase text-smoke">
            Merch is taking a quick break — check back soon.
          </p>
        ) : result.items.length === 0 ? (
          <p className="font-display mt-16 text-3xl font-extrabold uppercase text-smoke">
            Merch restock coming soon.
          </p>
        ) : (
          <>
            <ul className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((item) => (
                <MerchCard key={item.id} item={item} />
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
