import { getSquareMerch } from "@/lib/square";
import { formatPrice } from "@/lib/types";
import { RefreshButton } from "./refresh-button";

// Read-only: Square owns merch now (Round 6). This panel just mirrors what's
// live so the owners can sanity-check. Always pull fresh (no cache) and skip
// minting checkout links — this is a read-only view.
export const dynamic = "force-dynamic";

export default async function AdminMerchPage() {
  const result = await getSquareMerch({ revalidate: false, withCheckout: false });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-navy">
          Merch
        </h1>
        <RefreshButton />
      </div>

      {/* Plain-language explainer of the new model. */}
      <div className="border-2 border-navy bg-paper p-4">
        <p className="font-display text-lg font-bold uppercase leading-tight text-navy">
          Merch is managed in Square
        </p>
        <p className="mt-2 text-sm leading-relaxed text-char">
          Add items, set prices, colors, sizes, photos, and stock in the{" "}
          <strong>Square app</strong>. The website pulls it in automatically and
          updates within about a minute — there’s nothing to edit here. See{" "}
          <span className="font-mono text-xs">SQUARE_SETUP.md</span> for the
          step-by-step.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-char">
          <strong>Per-color photos:</strong> to make the site show a different
          photo when a shopper picks a color, attach a photo to each{" "}
          <em>color variation</em> from the Square <strong>web dashboard</strong>{" "}
          (squareup.com → the item → a variation → add image). A photo added only
          to the item shows for every color.
        </p>
        <p className="font-mono mt-3 text-[0.6rem] uppercase tracking-[0.14em] text-smoke">
          Live now from Square. Tap Refresh to re-check.
        </p>
      </div>

      {/* Read-only mirror of what's currently live. */}
      {!result.ok ? (
        <p className="font-mono text-sm text-ember">
          Couldn’t reach Square right now. Check the Square app, then Refresh.
        </p>
      ) : result.items.length === 0 ? (
        <p className="font-mono text-sm text-smoke">
          No merch in Square yet. Add your first item in the Square app.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {result.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 border border-navy/20 bg-paper p-3"
            >
              <div className="w-16 shrink-0">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="aspect-[4/5] w-full border border-navy/20 object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/5] w-full items-center justify-center border border-navy/20 bg-sage-wash">
                    <span className="font-mono text-[0.5rem] uppercase tracking-widest text-smoke">
                      No photo
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display truncate text-lg font-bold uppercase leading-tight text-navy">
                  {item.name}
                </p>
                <p className="font-mono text-xs text-smoke">
                  {item.multiPrice ? "From " : ""}
                  {formatPrice(item.priceCents)}
                  {item.soldOut && <span className="ml-2 text-ember">· Sold out</span>}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {item.variations.map((v) => (
                    <span
                      key={v.id}
                      className={`font-mono border px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.12em] ${
                        v.soldOut
                          ? "border-navy/15 text-smoke line-through"
                          : "border-navy/30 text-navy"
                      }`}
                    >
                      {v.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
