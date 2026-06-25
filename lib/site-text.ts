// Round 8 — the small set of site strings the owners can edit from the dashboard.
// This module is PURE (no DB, no server-only) so it's shared by the public
// consumers, the resolver in lib/queries.ts, and the admin Site Text form.
//
// Rules:
// - Every key has a hardcoded default = its current on-site copy. If the stored
//   value is empty/missing, consumers render the default (never blank).
// - Only the strings listed here are editable. Nav labels, eyebrows, button
//   microcopy elsewhere, and legal/structural text stay hardcoded on purpose.

import { DEFAULT_ABOUT_PARAGRAPH } from "@/lib/types";

export type SiteTextKey =
  | "home_hero_headline"
  | "home_hero_subhead"
  | "home_hero_cta"
  | "home_howitworks_1"
  | "home_howitworks_2"
  | "home_howitworks_3"
  | "home_story_heading"
  | "home_story_text"
  | "batch_intro"
  | "about_title"
  | "about_paragraph"
  | "footer_tagline"
  | "notify_blurb"
  | "announcement_enabled"
  | "announcement_text";

export type SiteText = Record<SiteTextKey, string>;

/** Hardcoded fallbacks = the current copy. about_paragraph reuses the Round 2
 *  constant so there's a single source of truth (and the same key in the DB). */
export const SITE_TEXT_DEFAULTS: SiteText = {
  // The big hero headline is TWO lines; a newline separates them. (Round 9 fix:
  // both big lines live here so the paragraph subline can become the subhead.)
  home_hero_headline: "Small-batch sausage.\nColumbia, SC.",
  // The paragraph under the big headline — the line the owner means by "subhead".
  home_hero_subhead: "Three friends, a smoker, and a new pair of flavors every week.",
  home_hero_cta: "See this week's batch",
  home_howitworks_1: "Two new flavors drop every week.",
  home_howitworks_2: "Claim your packs — no payment up front.",
  home_howitworks_3: "We confirm a pickup time in Columbia.",
  home_story_heading: "Made by hand, by three friends.",
  home_story_text:
    "We started Hossauges in 2024 in Columbia, SC, grinding and smoking about a hundred pounds a week. Every batch is small, hands-on, and a little experimental.",
  batch_intro: "Two flavors, packs of three. Reserve below — pickup in Columbia.",
  about_title: "Three friends, a smoker.",
  about_paragraph: DEFAULT_ABOUT_PARAGRAPH,
  footer_tagline:
    "Small-batch sausage, made by hand in Columbia, SC. New flavors drop weekly.",
  notify_blurb: "One short email when a new batch goes live. No spam, ever.",
  // Announcement bar is net-new: off + empty by default, so it never renders
  // until the owner turns it on with a message.
  announcement_enabled: "",
  announcement_text: "",
};

export const SITE_TEXT_KEYS = Object.keys(SITE_TEXT_DEFAULTS) as SiteTextKey[];

/** The announcement toggle stores this string when "on". */
export const ANNOUNCEMENT_ON = "on";
export function announcementEnabled(text: SiteText): boolean {
  return text.announcement_enabled === ANNOUNCEMENT_ON && text.announcement_text.trim() !== "";
}

export type SiteTextGroup = "Home" | "Batch" | "About" | "Footer" | "Announcement";
export type SiteTextControl = "text" | "textarea" | "toggle";

export type SiteTextField = {
  key: SiteTextKey;
  label: string;
  /** Tiny hint of where it shows on the site. */
  where: string;
  group: SiteTextGroup;
  control: SiteTextControl;
  /** Soft character-count guidance (no hard block) for layout-sensitive lines. */
  softMax?: number;
};

/** Drives the dashboard form: order + grouping + control type. */
export const SITE_TEXT_FIELDS: SiteTextField[] = [
  { key: "home_hero_headline", label: "Hero headline", where: "Home — big headline (one phrase per line)", group: "Home", control: "textarea" },
  { key: "home_hero_subhead", label: "Hero subline", where: "Home — sentence under the big headline", group: "Home", control: "textarea", softMax: 90 },
  { key: "home_hero_cta", label: "Hero button", where: "Home — hero button label", group: "Home", control: "text", softMax: 24 },
  { key: "home_howitworks_1", label: "How it works — 1 (We post)", where: "Home — first step detail", group: "Home", control: "text" },
  { key: "home_howitworks_2", label: "How it works — 2 (You reserve)", where: "Home — second step detail", group: "Home", control: "text" },
  { key: "home_howitworks_3", label: "How it works — 3 (You pick up)", where: "Home — third step detail", group: "Home", control: "text" },
  { key: "home_story_heading", label: "Story teaser heading", where: "Home — “Our story” block heading", group: "Home", control: "text", softMax: 48 },
  { key: "home_story_text", label: "Story teaser text", where: "Home — “Our story” block paragraph", group: "Home", control: "textarea" },
  { key: "batch_intro", label: "Batch intro", where: "Batch page — line under the heading", group: "Batch", control: "textarea" },
  { key: "about_title", label: "About heading", where: "About page — big story heading", group: "About", control: "text", softMax: 40 },
  { key: "about_paragraph", label: "About paragraph", where: "About page — story paragraph", group: "About", control: "textarea" },
  { key: "footer_tagline", label: "Footer tagline", where: "Footer — short line by the logo", group: "Footer", control: "textarea" },
  { key: "notify_blurb", label: "Drop-alerts blurb", where: "Footer — under “Get drop alerts”", group: "Footer", control: "text" },
  { key: "announcement_enabled", label: "Show announcement bar", where: "Thin bar at the very top of every page", group: "Announcement", control: "toggle" },
  { key: "announcement_text", label: "Announcement text", where: "Shown in the top bar when on", group: "Announcement", control: "text", softMax: 80 },
];
