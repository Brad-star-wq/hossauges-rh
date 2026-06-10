import type { Metadata } from "next";
import { Eyebrow } from "@/components/eyebrow";
import { FlavorArchive } from "@/components/flavor-archive";
import { getArchiveFlavors } from "@/lib/queries";

export const metadata: Metadata = { title: "Flavor Archive" };
export const revalidate = 60;

export default async function FlavorsPage() {
  const flavors = await getArchiveFlavors();

  return (
    <div className="paper-grain">
      <section className="container py-16 sm:py-24">
        <Eyebrow>Every flavor ever</Eyebrow>
        <h1 className="font-display mt-4 text-5xl font-extrabold uppercase leading-[0.95] text-navy sm:text-7xl">
          Flavor Archive
        </h1>
        <p className="mt-4 max-w-md text-lg text-char">
          Everything we&apos;ve ever smoked. See one you miss? Vote it back onto
          the board.
        </p>

        <div className="mt-12">
          {flavors.length === 0 ? (
            <p className="font-display text-3xl font-extrabold uppercase text-smoke">
              No flavors archived yet.
            </p>
          ) : (
            <FlavorArchive flavors={flavors} />
          )}
        </div>
      </section>
    </div>
  );
}
