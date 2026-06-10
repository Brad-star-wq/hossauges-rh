# SESSION 3 — Drop Page + Flavor Archive (mock data)

## Goal
The full Drop Board with the reserve form (UI only), plus the animated flavor archive with vote buttons.

## Steps — `/drop`
1. Extend `DropBoard` with `variant="full"`: each flavor gets photo placeholder (4:3), meat-type chip, brief description, price per 3-pack in mono, sold-out `Stamp`.
2. **Reserve form** (client component, UI only this session): name, phone or email (single "How do we reach you?" field), flavor select (sold-out options disabled with strikethrough), quantity stepper (1–10 packs). Submit button "Reserve my packs". Build success panel ("You're on the list — we'll reach out to confirm pickup.") and inline validation states now.
3. **Empty state** when no active drop: display headline "NEXT DROP IS IN THE WORKS.", notify-me field, link to `/flavors`. Toggle via a mock flag to verify.

## Steps — `/flavors`
4. Build archive from mock list: two groups (100% PORK / BEEF & PORK MIX) with display-caps group headers and star-stripe SVG divider.
5. Flavor cards: name, mono `MADE ×N` badge, hover lift + ember border. Staggered grid reveal.
6. **Vote button** per card: small "Want it back?" pill → increments local count optimistically, disables after click (localStorage de-dupe). Real persistence in Session 6.

## Acceptance
- [ ] Sold-out flavor unselectable in form; quantity stepper keyboard-accessible.
- [ ] Empty-state renders correctly when mock flag flipped.
- [ ] Archive groups, badges, and vote de-dupe all work at 375px.
- [ ] `npm run build` passes.
