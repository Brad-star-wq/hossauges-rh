import type { Metadata } from "next";
import { Eyebrow } from "@/components/eyebrow";
import { Button } from "@/components/button";
import { Placeholder } from "@/components/placeholder";
import { Section } from "@/components/section";
import { Gallery } from "@/components/gallery";
import { getSiteContent, getGallery } from "@/lib/queries";

export const metadata: Metadata = {
  title: "About",
  description:
    "Two friends making about a hundred pounds of small-batch sausage a week in Columbia, SC, since 2024.",
};
export const revalidate = 60;

export default async function AboutPage() {
  const [content, gallery] = await Promise.all([getSiteContent(), getGallery()]);

  return (
    <>
      {/* Story */}
      <section className="paper-grain">
        <div className="container py-16 sm:py-24">
          <Eyebrow>Our story</Eyebrow>
          <div className="mt-8 grid items-center gap-10 md:grid-cols-2">
            <div>
              <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.95] text-navy sm:text-6xl">
                Two friends, a smoker.
              </h1>
              <p className="mt-5 max-w-prose text-lg text-char">
                {content.about_paragraph}
              </p>
            </div>
            {content.about_hero_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.about_hero_url}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full border border-navy/20 object-cover"
              />
            ) : (
              <Placeholder label="About photo" ratio="4/3" tone="navy" />
            )}
          </div>
        </div>
      </section>

      {/* The Gallery */}
      <section className="bg-sage-wash">
        <Section as="div" className="!py-0">
          <div className="py-16 sm:py-24">
            <Eyebrow>Behind the scenes</Eyebrow>
            <h2 className="font-display mt-3 text-4xl font-extrabold uppercase leading-[0.95] text-navy sm:text-5xl">
              The Gallery
            </h2>
            <div className="mt-10">
              <Gallery items={gallery} />
            </div>
          </div>
        </Section>
      </section>

      {/* Instagram */}
      <Section className="paper-grain">
        <div className="flex flex-col items-start gap-5">
          <Eyebrow>Follow along</Eyebrow>
          <h2 className="font-display text-4xl font-extrabold uppercase leading-[0.95] text-navy sm:text-5xl">
            @hossaugessc
          </h2>
          <p className="max-w-md text-char">
            Drops, behind-the-scenes, and pickup details land on Instagram first.
          </p>
          <Button
            href="https://instagram.com/hossaugessc"
            variant="primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow the drops
          </Button>
        </div>
      </Section>
    </>
  );
}
