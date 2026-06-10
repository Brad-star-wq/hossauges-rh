import type { Metadata } from "next";
import { Eyebrow } from "@/components/eyebrow";
import { Button } from "@/components/button";
import { DropBoard } from "@/components/drop-board";
import { ReserveForm } from "@/components/reserve-form";
import { NotifyStrip } from "@/components/notify-strip";
import { getActiveDrop } from "@/lib/queries";

export const metadata: Metadata = { title: "This Week's Drop" };
export const revalidate = 60;

export default async function DropPage() {
  const drop = await getActiveDrop();

  // Empty state — no active drop.
  if (!drop) {
    return (
      <>
        <section className="paper-grain">
          <div className="container py-24 text-center sm:py-32">
            <Eyebrow>This week</Eyebrow>
            <h1 className="font-display mx-auto mt-4 max-w-3xl text-5xl font-extrabold uppercase leading-[0.95] text-navy sm:text-7xl">
              Next drop is in the works.
            </h1>
            <p className="mx-auto mt-6 max-w-md text-lg text-char">
              No flavors on the board right now. Get on the list and we&apos;ll
              tell you the moment the next pair drops.
            </p>
            <div className="mt-8 flex justify-center">
              <Button href="/flavors" variant="secondary">
                Browse past flavors
              </Button>
            </div>
          </div>
        </section>
        <NotifyStrip />
      </>
    );
  }

  return (
    <section className="paper-grain">
      <div className="container py-16 sm:py-24">
        <Eyebrow>This week</Eyebrow>
        <h1 className="font-display mt-4 text-5xl font-extrabold uppercase leading-[0.95] text-navy sm:text-7xl">
          The Drop
        </h1>
        <p className="mt-4 max-w-md text-lg text-char">
          Two flavors, packs of three. Reserve below — pickup in Columbia.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <DropBoard drop={drop} variant="full" />
          <ReserveForm flavors={drop.flavors} />
        </div>
      </div>
    </section>
  );
}
