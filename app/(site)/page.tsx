import Link from "next/link";
import { Hero } from "@/components/hero";
import { Section } from "@/components/section";
import { Eyebrow } from "@/components/eyebrow";
import { Button } from "@/components/button";
import { DropBoard } from "@/components/drop-board";
import { HowItWorks } from "@/components/how-it-works";
import { Placeholder } from "@/components/placeholder";
import { PreorderPopup } from "@/components/preorder-popup";
import { getActiveDrop, getSiteContent, getSiteText, getPreorder } from "@/lib/queries";
import { getSquareMerch } from "@/lib/square";
import { formatPrice } from "@/lib/types";

export const revalidate = 60;

export default async function HomePage() {
  const [drop, merch, content, text, preorder] = await Promise.all([
    getActiveDrop(),
    getSquareMerch({ withCheckout: false }), // teaser links to /merch; no checkout links
    getSiteContent(),
    getSiteText(),
    getPreorder(),
  ]);

  const teaserMerch = merch.ok ? merch.items.slice(0, 3) : [];

  return (
    <>
      {/* Pre-order pop-up (shows on load only when enabled + has items) */}
      <PreorderPopup popup={preorder} />

      <Hero
        photoUrl={content.home_hero_url || null}
        headline={text.home_hero_headline}
        subhead={text.home_hero_subhead}
        cta={text.home_hero_cta}
      />

      {/* This week's batch + how it works, side by side */}
      <Section className="paper-grain">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div>
            <Eyebrow>This week</Eyebrow>
            <div className="mt-4">
              {drop ? (
                <DropBoard drop={drop} variant="condensed" />
              ) : (
                <div className="flex h-full flex-col justify-center border-2 border-navy bg-paper p-8 shadow-[6px_6px_0_0_var(--color-navy)]">
                  <p className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-navy">
                    Next batch is in the works.
                  </p>
                </div>
              )}
            </div>
          </div>
          {/* On desktop, align the box top with the batch card (below the eyebrow). */}
          <HowItWorks
            className="lg:mt-[2.75rem]"
            details={[
              text.home_howitworks_1,
              text.home_howitworks_2,
              text.home_howitworks_3,
            ]}
          />
        </div>
      </Section>

      {/* Merch teaser */}
      {teaserMerch.length > 0 && (
        <Section className="paper-grain">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Wear the brand</Eyebrow>
              <h2 className="font-display mt-3 text-4xl font-extrabold uppercase leading-[0.95] text-navy sm:text-5xl">
                Merch
              </h2>
            </div>
            <Button href="/merch" variant="secondary">
              Shop all
            </Button>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3">
            {teaserMerch.map((item) => (
              <li key={item.id}>
                <Link href="/merch" className="group block">
                  <div className="overflow-hidden border border-navy/15">
                    {item.imageUrl ? (
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
                  </div>
                  <p className="font-display mt-3 text-lg font-bold uppercase leading-tight text-navy">
                    {item.name}
                  </p>
                  <p className="font-mono text-sm text-smoke">
                    {item.multiPrice ? "From " : ""}
                    {formatPrice(item.priceCents)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Story teaser */}
      <section className="bg-sage-wash">
        <Section as="div" className="!py-0">
          <div className="grid items-center gap-10 py-16 sm:py-24 md:grid-cols-2">
            {content.home_story_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.home_story_image}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full border border-navy/20 object-cover"
              />
            ) : (
              <Placeholder label="Story photo" ratio="4/3" tone="navy" />
            )}
            <div>
              <Eyebrow>Our story</Eyebrow>
              <h2 className="font-display mt-3 text-4xl font-extrabold uppercase leading-[0.95] text-navy sm:text-5xl">
                {text.home_story_heading}
              </h2>
              <p className="mt-4 max-w-prose whitespace-pre-line text-char">
                {text.home_story_text}
              </p>
              <div className="mt-6">
                <Button href="/about" variant="secondary">
                  Our story
                </Button>
              </div>
            </div>
          </div>
        </Section>
      </section>
    </>
  );
}
