-- ============================================================================
-- Hossauges — drop merch_items (Round 6). Square is now the source of truth
-- for all merch: the website reads its catalog + inventory live (lib/square.ts)
-- and buyers check out on Square's hosted page. The old DB-backed merch system
-- is fully removed so there's no second, competing source.
-- Apply in the Supabase SQL Editor after 001–005. Safe to re-run.
-- ============================================================================

-- Dropping the table automatically removes its RLS policy
-- ("merch_items public select active") and its index (idx_merch_active), so a
-- single idempotent statement is all that's needed.
--
-- NOTE: do NOT add an explicit `drop policy if exists "..." on merch_items;`
-- here — `IF EXISTS` guards the *policy*, not the *table*, so that statement
-- itself throws `42P01: relation "merch_items" does not exist` once the table
-- is gone (e.g. on a second run). `drop table if exists` has no such problem.
drop table if exists merch_items cascade;
