# CHANGES — Round 8 (Editable Site Text from the dashboard)

Read CLAUDE.md and SPEC.md first. Goal: let the owners edit the handful of site strings that actually change, from a new **Site Text** dashboard tab — WITHOUT making every label on the site editable (that would bloat the dashboard and let copy break layouts). Reuse the existing `site_content` key/value table from Round 2 (about paragraph + hero images already live there) — likely **no new migration** needed; if a tracking field is needed, that's migration 007.

**Hard rules:**
1. Every editable string keeps a **hardcoded fallback** = its current text. If the DB value is empty/missing, the site renders the current copy. Empty must never produce a blank or broken layout.
2. Brief, plain dashboard labels; phone-first; writes via service-role server action; `revalidatePath` after save so the public site updates.
3. Do NOT commit or push. Stop when `npm run build` is clean and report.

## Scope — these strings become editable (and ONLY these)
Store each under a clear `site_content` key. Use the current on-site text as the default/fallback.

**Home**
- `home_hero_headline` — the big hero headline ("Small-batch sausage.")
- `home_hero_subhead` — the hero line under it ("Columbia, SC." / tagline)
- `home_hero_cta` — hero button label ("See this week's batch")
- `home_howitworks_1` , `home_howitworks_2` , `home_howitworks_3` — the three short how-it-works lines (We post / You reserve / You pick up detail text)

**Batch (`/drop`)**
- `batch_intro` — the line under the heading ("Two flavors, packs of three. Reserve below — pickup in Columbia.")

**About**
- `about_paragraph` — ALREADY editable (Round 2). Surface it here too so all text lives in one tab. Don't duplicate storage — read/write the same key.

**Footer / global**
- `footer_tagline` — the short footer line ("Small-batch sausage, made by hand in Columbia, SC. New flavors drop weekly.")
- `notify_blurb` — the "Get drop alerts" subtext ("One short email when a new batch goes live. No spam, ever.")

**Optional announcement bar (nice-to-have, include it):**
- `announcement_enabled` (on/off) + `announcement_text` — a thin bar at the very top of the site for a one-line message ("Pickup this Saturday!"). If disabled or empty, the bar doesn't render. Keep it on-brand and dismissible.

> Do NOT make editable: nav labels, section eyebrows, button microcopy elsewhere, legal line, or any structural text. Those don't change and would clutter the tool.

## Dashboard — new "Site Text" tab
- One screen, grouped by page (Home / Batch / About / Footer / Announcement), each field a labeled text input or textarea with the current value loaded.
- Show a tiny hint of where each appears ("Home hero headline").
- A character-count hint on the hero headline/subhead so they don't overrun the layout (soft guidance, not a hard block).
- "Save" persists all changes; success state; `revalidatePath` for affected routes so the public site reflects edits within the normal window.
- Empty a field → it reverts to the built-in default (make this behavior clear with placeholder text showing the default).

## Wire-up
- Update Home, `/drop`, About, Footer, and the announcement bar to read these keys server-side with the hardcoded fallback.
- Keep one small helper (e.g. `getSiteText(key, fallback)`) so every consumer reads consistently.

## Acceptance
- [ ] Site Text tab lists exactly the scoped strings, grouped by page, current values loaded.
- [ ] Editing any string saves and shows on the public site within the normal revalidate window.
- [ ] Emptying a string reverts to its built-in default — never blank, never broken.
- [ ] Announcement bar shows when enabled+non-empty, hides otherwise, dismissible, on-brand.
- [ ] about_paragraph reads/writes the SAME key as Round 2 (no duplicate storage).
- [ ] No nav/eyebrow/structural text became editable.
- [ ] `npm run build` clean. No commit, no push.
