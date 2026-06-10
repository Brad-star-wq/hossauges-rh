# SESSION 4 — Merch + About (mock data)

## Goal
Finish the public pages: the Square-linked merch grid and the brief About page.

## Steps — `/merch`
1. Grid of merch cards from mock data: photo placeholder (4:5, zoom 1.03 on hover), name, mono price, sizes note ("S–XXL").
2. "Buy" button per card → `target="_blank" rel="noopener"` to the item's `square_link` (mock `#` for now). Mono micro-caption under grid: "Checkout is handled securely by Square."
3. Inactive items are excluded from render (filter on `active`).
4. Empty state: "Merch restock coming soon."

## Steps — `/about`
5. Brief story block: 2–3 short sentences (two friends, est. 2024, ~100 lbs a week, Columbia SC), photo placeholder.
6. **Process strip**: GRIND → STUFF → SMOKE → PACK as a horizontal sequence with mono labels and square photo placeholders; staggered reveal. (Real process order — sequence earned.)
7. Instagram block: handle @hossaugessc, button "Follow the drops" linking out.

## Acceptance
- [ ] Buy buttons open in new tab; inactive mock item hidden.
- [ ] About copy total under ~80 words.
- [ ] Both pages flawless at 375px; `npm run build` passes.
