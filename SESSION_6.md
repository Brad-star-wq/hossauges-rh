# SESSION 6 — Wire Public Site: Data, Reserve Form, Notify-Me, Email

## Goal
Public site runs entirely on Supabase data; forms persist and trigger owner emails.

## Steps
1. Replace `lib/mock.ts` imports with `lib/queries.ts` across Home, Drop, Flavors, Merch. Pages become server components fetching with the anon client; revalidate 60s (`export const revalidate = 60`).
2. Server action `reserveSubmit`:
   - Zod-validate (name 2+, contact looks like email OR 10-digit phone, qty 1–10, flavor belongs to active drop and not sold out).
   - Insert into `interest_submissions`.
   - Send Resend email to hossaugessc@outlook.com: subject `New reserve — {flavor} ×{qty}`, clean minimal HTML (mono aesthetic), reply-to set to customer contact when it's an email.
   - Rate-limit: 5/hour per IP (simple upstash-free approach: in-memory per-instance is NOT enough — use a `submission_guard` table with IP hash + window, or accept per-instance limit and document it; choose and note it).
3. Server action `notifySubmit`: validate email, upsert into `email_list`, friendly duplicate message ("You're already on the list."). Wire to Home strip + Footer + Drop empty state.
4. Human-in-the-loop: create Resend account, add `RESEND_API_KEY`; use sandbox sender until domain DNS is verified (note the DNS records needed for the real domain).
5. Vote button: server action `voteFlavor` incrementing `drop_flavors.votes` (clamp via localStorage client-side as before).
6. Error handling: every action returns typed `{ ok, message }`; forms show inline errors, never raw exceptions.

## Acceptance
- [ ] Reserve flow end-to-end: submit on phone → row in Supabase → email lands in Outlook.
- [ ] Sold-out flavor rejected server-side even if client bypassed.
- [ ] Notify-me dedupes gracefully; votes persist.
- [ ] `npm run build` passes; no service-role key reachable from client bundle (`grep` the build output).
