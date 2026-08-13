# DASHBOARD MAKEOVER — Build Doc

Four rounds against the existing `hossauges-rh` repo. Work one round at a time. **Stop at the end of each round, report, and wait.** Do not commit or push mid-round. Do not start the next round without being told.

Stack as-is: Next 16.2.9, React 19.2.4, Tailwind v4 (tokens live in `@theme` in `app/globals.css` — there is no `tailwind.config`), Supabase, framer-motion, `clsx` + `tailwind-merge` via `lib/cn`. **Add no new dependencies.** No icon library, no component library, no new fonts.

Reference mockup: `direction-b-worktable.html` (drop it in the repo root). It is a static approximation, not a spec — the rounds below are authoritative where they disagree.

---

## Rules that apply to every round

1. **Nothing on the public site changes.** Not the fonts, not the components, not the tokens. Every edit lands under `app/admin/**` or `components/admin/**`, except where a round says otherwise. `font-display` and `font-mono` stay exactly as they are for the public site.
2. **Never invent copy.** If a label is being removed and nothing replaces it, remove it. Do not write explanatory helper text. The two owners use this weekly and know what the fields do.
3. **No money anywhere in the admin.** No prices, no totals, no "outstanding," no currency symbols. Payment amounts live in Square. This is a hard constraint — if a layout looks empty without a number, leave it empty.
4. Keep `max-w` on the content column. Do not widen the layout to fill a desktop screen.
5. Preserve existing behavior: auth guard, `force-dynamic`, optimistic updates, `router.refresh()` after writes, `window.confirm` on destructive actions.

---

# ROUND 1 — Per-pack paid tracking (backend only)

No UI in this round. Schema, queries, and one server action.

## 1a. Report the schema first

Before writing anything, read and report:

- The migration files in the repo (`supabase/migrations/` or wherever they live)
- `lib/admin-queries.ts` — specifically `getSubmissions`, and the shape of `SubmissionRow`
- `lib/types.ts`
- `app/actions.ts` — the `reserveSubmit` insert path

Report back: the exact table and column names for submissions and their line items, and how `items: { flavor_name, quantity }[]` on `SubmissionRow` is assembled. **Then stop.** Do not write the migration until the table names are confirmed against the actual repo.

## 1b. Migration

Add a new numbered migration file continuing the existing sequence. It must be **idempotent** — `IF NOT EXISTS` / `IF EXISTS` on every statement, and no `DROP` that assumes a prior object still exists. A previous migration in this repo broke exactly that way.

On the submission **line-item** table (the one holding flavor + quantity per order):

```sql
ALTER TABLE <line_item_table>
  ADD COLUMN IF NOT EXISTS paid_count integer NOT NULL DEFAULT 0;

ALTER TABLE <line_item_table>
  DROP CONSTRAINT IF EXISTS <line_item_table>_paid_count_range;

ALTER TABLE <line_item_table>
  ADD CONSTRAINT <line_item_table>_paid_count_range
  CHECK (paid_count >= 0 AND paid_count <= quantity);
```

**Why an integer and not a boolean:** a customer can order 2 packs of the same flavor and pay for one of them. A boolean on the line can only say all-or-nothing. `paid_count` is how many packs of that line are paid. Packs of the same flavor are interchangeable, so *which* pack is paid is not recorded and does not need to be.

Do not apply the migration. Output the SQL for manual application in the Supabase SQL editor, which is the existing workflow here.

## 1c. Query

Extend the line-item shape on `SubmissionRow` in `lib/admin-queries.ts` to carry `id`, `quantity`, and `paid_count`. The row needs a stable per-line id so the UI can target it. Add whatever derived fields the table view needs — total packs, and packs paid — computed in the query, not the component.

## 1d. Server action

In `app/admin/actions.ts`, next to `markContacted`, add:

```ts
export async function setPacksPaid(itemId: string, paidCount: number)
```

- Same shape as the other actions: `"use server"`, service-role client, returns `{ ok, message }`, wrapped in try/catch.
- Clamp `paidCount` server-side to `0…quantity` by reading the row's quantity first. Do not trust the client value.
- `revalidatePath("/admin/submissions")` on success, matching how the other actions revalidate.

## Round 1 acceptance

- [ ] Schema reported and table names confirmed against the repo before any SQL was written
- [ ] Migration is idempotent and safe to run twice
- [ ] SQL printed for manual application, not executed
- [ ] `SubmissionRow` line items carry `id`, `quantity`, `paid_count`
- [ ] `setPacksPaid` clamps server-side
- [ ] `npm run build` passes, existing admin pages still render

---

# ROUND 2 — Admin primitives and typography

The single highest-leverage round. Right now `labelCls` and `fieldCls` are copy-pasted string constants across `drop-editor.tsx`, `gallery-manager.tsx`, `preorder-manager.tsx`, and `site-text-manager.tsx`, and every button carries its own inline class string. That makes any restyle a forty-file edit.

## 2a. Create `components/admin/ui.tsx`

One file exporting small unstyled-by-the-caller primitives. Use `cn()` so callers can extend, and forward the standard HTML props:

- `PageHeader` — `title` only. **No `subtitle`/`description` prop.** The helper paragraphs are being deleted, and a prop for them invites their return.
- `Label` — sentence case, body font, `text-xs`, `text-smoke`, normal tracking.
- `Field` — the text input. `TextArea` — same styling, and it should size to its content rather than a fixed `rows`; `rows={2}` currently truncates flavor descriptions mid-sentence and `rows={4}` gives a 200px box to a 24-character button label.
- `Select`
- `Button` with variants `primary` (ember-press bg, cream text), `secondary` (navy outline), `ghost` (hairline border, navy text), `danger` (ember text). Minimum touch target 44px on all of them.
- `Card` — the bordered `bg-paper` surface used everywhere.
- `Toggle` — the existing `role="switch"` pattern from the sold-out and pre-order toggles, extracted.
- `Toast` / `StatusLine` — the `{ ok, message }` result line, currently reimplemented in four places.

## 2b. Typography

**In admin only**, stop using `font-display` and `font-mono`. Archivo is already loaded as `--font-body` and the `<body>` already defaults to it, so this is a matter of *removing* classes, not adding a font. Do not add a Google Fonts link. Do not change `app/layout.tsx` or `app/fonts.ts`.

- Remove `font-mono` from every label, hint, button, tab, and status line under `app/admin/**` and `components/admin/**`.
- Remove `font-display` from admin headings. Page `<h1>` becomes Archivo 700, ~24px, `tracking-tight`, `text-navy-deep`.
- Remove `uppercase` and `tracking-[0.18em]` from admin labels and buttons. Sentence case.
- Apply Tailwind's `tabular-nums` to dates, quantities, and phone numbers so columns align without a monospace face.
- The one exception: the wordmark in the nav rail may keep its current treatment.

Colors are unchanged. Every existing token stays. Ember gets rationed to the active-nav marker, unpaid state, and destructive actions — it should stop appearing on ordinary labels and hints.

## 2c. Delete helper copy

Remove outright, replacing with nothing:

- `drop-editor.tsx` — "N flavors. Edit, add, or remove — then Save changes."
- `gallery-manager.tsx` — "Photos, the About story, and the homepage hero. (Text lives in the Site Text tab.)"
- `site-text-manager.tsx` — "Edit the words on the site. Leave a field blank to use the built-in default."
- `preorder-manager.tsx` — "The homepage pop-up. Turn it on, set the title, add up to N items."
- `preorder-manager.tsx` — "Add the item, then upload its photo from the row above."
- `flavor-photos.tsx` — "Save changes to add photos to this flavor."
- The `field.where` hint under every Site Text input, and the whole `MERCH` explainer block (that page is deleted in Round 3 anyway).

Keep: error messages, empty states, the character counters, and the confirm dialogs. Those tell you something you can't see.

## 2d. Migrate the existing pages

Rewrite `drop-editor`, `gallery-manager`, `preorder-manager`, `site-text-manager`, `login-form`, `flavor-photos`, `photo-upload`, and `publish-first-drop` to use the primitives. Delete the local `labelCls` / `fieldCls` constants. Behavior stays identical — this is a styling and structure pass only.

## Round 2 acceptance

- [ ] Zero occurrences of `font-mono` and `font-display` under `app/admin/**` and `components/admin/**`, except the nav wordmark
- [ ] Zero occurrences of `labelCls` / `fieldCls` local constants
- [ ] Public site renders byte-identically — spot-check home, `/drop`, `/flavors`, `/merch`, `/about`
- [ ] Every listed string is gone
- [ ] Textareas fit their content
- [ ] All forms still save; no behavior regressions
- [ ] `npm run build` and `npm run lint` pass

---

# ROUND 3 — Nav rail, and delete Merch

## 3a. Delete the Merch admin page

- Delete `app/admin/merch/` entirely, including `refresh-button.tsx`.
- Remove the Merch entry from the admin tab list.
- **Leave `lib/square.ts` and the public `/merch` page completely alone.** The admin page was a read-only mirror; the storefront still depends on the Square integration.

## 3b. Replace the top tab bar with a side rail

Rewrite `components/admin/admin-nav.tsx`.

Desktop (≥840px): fixed left rail, ~186px, `bg-navy-deep`, full viewport height, sticky. Wordmark at top. Nav items stacked, sentence case, ~14.5px, `rgba(cream,.58)` resting and full cream on hover. Active item gets a 3px ember left border and a slightly darker background. Log out sits at the bottom of the rail.

Below 840px: collapse the rail to an icon-width strip, or fall back to the existing horizontal scrolling tab bar — whichever you can do without adding an icon dependency. **The phone experience must not regress**; the two owners work from phones and that matters more than the desktop rail.

Five destinations: Batch, Gallery, Site text, Pre-order, Reservations.

## 3c. Unpaid badge

"Reservations" carries a count badge — small ember pill with the number of orders that have at least one unpaid pack. `AdminNav` is a client component, so query the count in the server `app/admin/layout.tsx` and pass it down as a prop. Hide the badge entirely at zero; do not render a "0".

## 3d. Rename

The nav label and the page `<h1>` both become **Reservations**, matching what `submissions-view.tsx` already displays. Leave the route at `/admin/submissions` — renaming it is churn with no benefit.

## Round 3 acceptance

- [ ] `/admin/merch` 404s; public `/merch` still works and still pulls from Square
- [ ] Rail renders correctly at 1440px, 900px, and 390px
- [ ] Badge count is accurate and hidden at zero
- [ ] Keyboard focus is visible on every rail item

---

# ROUND 4 — Reservations worktable

Rewrite `components/admin/submissions-view.tsx`. This is where Rounds 1–3 land.

## 4a. Table

Replace the stacked cards with a table. Collapsed row height ~56px so twenty orders fit on one screen.

Columns, desktop: **Name** (with a second line reading `N packs · Aug 11, 2:24 AM`) · **Contact** (tel:/mailto: link, unchanged logic) · **Paid** (meter, see below) · **Status** (flags) · chevron.

Below 840px, drop the Contact and Status columns; keep Name, Paid, and the chevron. The row still expands.

Delete the duplicated `week_label` line. It currently prints under the items and, when a batch has one flavor, renders the flavor name twice in a row.

## 4b. Paid meter

Per order: a thin `sage` track with an `ember` fill, plus `paidPacks/totalPacks` in tabular numerals. Fill turns `navy` when the order is fully paid. No amounts.

## 4c. Expandable detail

Clicking a row expands it inline. Do not use a modal — the owners need several orders open side by side while they work the phone.

Inside, one row **per pack**, not per line item. A line with `quantity: 2` renders two rows. Each has its own checkbox. Checking `k` boxes on a line calls `setPacksPaid(lineId, k)`.

- Optimistic update, then `router.refresh()`, matching `markContacted`.
- Revert local state if the action fails.
- Label the checkbox "Paid".
- Fully-paid pack rows go muted, same treatment as the existing contacted-order fade.
- "Mark contacted" / "Contacted" toggle sits at the bottom of the expanded panel, reusing the existing `markContacted` action.

## 4d. Filters

Replace the bare drop `<select>` with a small toolbar:

- Segmented control: **Open** (has unpaid packs) / **Unpaid** / **All**. Default to Open.
- The existing batch `<select>`, restyled.
- "Copy email list (N)" — the existing clipboard behavior, moved into the toolbar. Drop the standalone email-list section at the bottom of the page; it takes a screen of vertical space to list addresses that only ever get copied wholesale. If you want them visible, put them behind the copy button as an expandable.

## 4e. Flags

Small uppercase chips in the Status column. `Unpaid` in ember when any pack is unpaid, `Call back` in navy when the order isn't marked contacted, `Settled` in muted grey when both are done. Compute from data — never hardcode.

## Round 4 acceptance

- [ ] A `quantity: 2` line renders two independent checkboxes
- [ ] Checking one of two updates the meter to `1/2` and persists across a hard refresh
- [ ] `paid_count` never exceeds `quantity`, including under fast repeated clicking
- [ ] A failed action reverts the checkbox
- [ ] No dollar amounts anywhere on the page
- [ ] Filters compose with the batch selector
- [ ] Row expand/collapse is keyboard accessible
- [ ] Usable at 390px wide
- [ ] `npm run build` and `npm run lint` pass

---

## Open question — flag it, don't decide it

If an order is fully paid, is "contacted" still meaningful, or does paid-in-full imply the handoff already happened? Right now they're independent flags and Round 4 keeps them that way. If they turn out to be redundant in practice, collapsing them removes a column and a click. Raise it after Round 4 ships; do not merge them preemptively.

## AMENDMENT — legacy rows are untracked, not unpaid

Pre-Round-9 submissions have no interest_items rows, so their packs have no
id and no paid_count. Their real payment state is unknown and must not be
guessed. Do not backfill them.

Round 1c — add `trackable: boolean` to SubmissionRow: true when the row has
real interest_items, false for the synthesized legacy fallback. Compute
totalPacks and paidPacks from trackable rows only; leave both at 0 when
trackable is false.

Round 3c — the nav badge counts only orders where trackable is true AND
paidPacks < totalPacks. Legacy rows never contribute.

Round 4a — the batch selector defaults to the current batch, not "All".

Round 4b — when trackable is false, render no meter. Show a muted "—".

Round 4c — when trackable is false, the expanded panel lists the flavor and
quantity with no checkboxes, and a single muted line: "Not tracked".

Round 4e — when trackable is false, the only Status flag is "Not tracked" in
muted grey. Never "Unpaid".
