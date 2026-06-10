# SESSION 5 — Supabase: Schema, RLS, Storage, Seed

## Goal
Live database matching SPEC §5, locked down with RLS, with a seed script that mirrors the mock data exactly.

## Steps
1. Human-in-the-loop: create Supabase project, paste `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` into `.env.local`.
2. Install `@supabase/supabase-js`. Create `lib/supabase/client.ts` (anon, browser) and `lib/supabase/admin.ts` (service role, **server-only** — guard with `server-only` import).
3. Write `supabase/migrations/001_init.sql` implementing SPEC §5 exactly: tables, checks, FKs, indexes on `drops.status`, `interest_submissions.drop_id`, `merch_items.active`.
4. RLS:
   - `drops`, `drop_flavors`: public SELECT.
   - `merch_items`: public SELECT where `active = true`.
   - `interest_submissions`: public INSERT only (no select).
   - `email_list`: public INSERT only.
   - Everything else: service role only.
5. Storage: bucket `photos`, public read, write via service role only.
6. `scripts/seed.ts` (run with service role): inserts the active mock drop + flavors, the full all-time flavor archive as one archived drop per historical batch (or a single `archived` catch-all drop holding legacy flavors — pick one, document it), and 3 merch items.
7. Add typed query helpers in `lib/queries.ts`: `getActiveDrop()`, `getArchiveFlavors()` (dedupes by name, sums ×N count and votes), `getMerch()`.

## Acceptance
- [ ] Migration applies cleanly to a fresh project.
- [ ] Anon key cannot read `interest_submissions` or write to `drops` (verify with a quick script).
- [ ] Seed runs idempotently; `getActiveDrop()` returns the Week of June 9 drop.
- [ ] `npm run build` passes.
