# CHANGES — Round 3 (scalable flavors + add-flavor dashboard + ticker box)

Read CLAUDE.md and SPEC.md first. The site currently assumes a drop has exactly 2 flavors. It must support a **variable number of flavors per batch (2 up to 12+)**, everywhere. No new migration needed — `drop_flavors` already supports many rows per drop; this is UI/logic work. End with `npm run build` clean and a summary.

---

## 1. Dashboard — add/remove flavors in a batch (CRITICAL — currently impossible)
The Drop/Batch editor only lets you edit the two existing flavors. Add full flavor management:
- **"Add flavor" button** that appends a new empty flavor form (name, meat type, description, price, photo upload, sold-out toggle).
- **"Remove flavor" button** on each flavor (confirm before delete; deletes that `drop_flavors` row).
- No fixed cap in the UI — support 2 through 12+ cleanly. Reorder is nice-to-have, not required.
- "Publish new batch" still archives the current batch; the new batch starts with one empty flavor (then they add more).
- Verify: adding a 3rd, 4th, 5th flavor in the dashboard immediately shows on the public batch page.

## 2. Home condensed batch menu — must scale gracefully
Right now the home menu is hardcoded for 2 flavors and looks awkward. Rebuild it to handle any count:
- Render all of the current batch's flavors as a clean, compact list inside the card (meat-type chip, name, price or SOLD OUT tag per row).
- It should look intentional with 2 flavors AND with 10+ — grow vertically with tidy row spacing; if the list gets long, cap the visible rows (e.g. first 6) and let **"See the full batch"** carry the rest. Pick a clean approach and keep it balanced (no giant empty card, no cramped overflow).
- Keep the "See the full batch" button → `/drop`.
- Mobile-first: must look right at 375px at every flavor count.

## 3. Full batch page (`/drop`) — confirm it scales
- Ensure the full board renders N flavors gracefully (already a list, just verify spacing/layout holds at 2 and at 12).
- Reserve form flavor dropdown must list ALL current flavors (sold-out ones disabled), not just two.

## 4. Flavor ticker stripe → a contained box
The all-time flavor marquee stripe feels awkward, especially on web. Convert it:
- Replace the scrolling marquee with a **contained box/card** styled like the batch menu card (paper background, navy border, same type system). Title it something like "EVERY FLAVOR WE'VE MADE" (eyebrow + heading).
- Inside, render the all-time flavors as wrapped tags/chips (grouped 100% Pork vs Beef & Pork, or a simple wrapped list — keep it tidy and balanced on both web and mobile).
- **Scroll order:** on mobile, this box becomes the next component after the batch menu (a clean vertical flow). On desktop, place it as a normal section, not a full-width stripe.
- Remove the old marquee component/animation if nothing else uses it.

---

## Acceptance
- [ ] Dashboard: can add and remove flavors in a batch; a batch with 5+ flavors saves and displays correctly.
- [ ] Home menu looks intentional and balanced at 2 flavors and at 10+, mobile and desktop.
- [ ] `/drop` full board and the reserve dropdown both handle N flavors.
- [ ] Flavor ticker is now a contained box (no marquee), tidy on web, correct scroll position on mobile.
- [ ] `npm run build` clean.
