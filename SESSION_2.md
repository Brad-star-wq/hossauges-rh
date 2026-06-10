# SESSION 2 — Home Page (mock data)

## Goal
The full home page per SPEC §3, powered by `lib/mock.ts`, with the page-load hero sequence and the condensed Drop Board.

## Steps
1. Create `lib/mock.ts` (data shapes mirror the future DB: Drop, DropFlavor, MerchItem, flavor archive list — see CLAUDE.md mock data).
2. **Hero**: full-viewport, `Placeholder` photo (final aspect: fills viewport) under a navy-deep/70 overlay. Headline "SMALL-BATCH SAUSAGE." / "COLUMBIA, SC." staggered word-rise on load (Framer variants). Sub-line one sentence. Ember CTA → `/drop`. Mono scroll hint bottom-center.
3. **DropBoard component (condensed variant)** in `components/drop-board.tsx`: paper card, 2px navy border, mono date-stamp header (week_label), two flavor tags (name in display caps, meat-type mono chip, price), `Stamp` on sold-out flavors. Entry animation: slight rotate settle. Prop `variant: 'condensed' | 'full'` — build condensed now, full in Session 3.
4. **Flavor ticker**: `Ticker` with the all-time list, ember dot separators, navy band.
5. **How it works**: three cards — POST / RESERVE / PICK UP — mono step labels (this IS a real sequence, numbering is earned), one sentence each, staggered reveal.
6. **Merch teaser**: 3 mock items, photo placeholders (4:5), name + mono price, link to `/merch`.
7. **Story teaser**: split section — photo placeholder + 2-sentence story + "Our story" secondary button.
8. **Notify strip**: navy band, one email input + button (visual only; wired in Session 6). Success/error states designed now.

## Acceptance
- [ ] Hero sequence plays once on load; 60fps; reduced motion = simple fade.
- [ ] Drop Board shows mock sold-out stamp on Jalapeño Pimento Brisket.
- [ ] Ticker loops seamlessly and pauses on hover.
- [ ] Flawless at 375px; no layout shift from placeholders.
- [ ] `npm run build` passes.
