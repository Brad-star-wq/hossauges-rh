-- ============================================================================
-- Hossauges — per-pack paid tracking (Dashboard Makeover, Round 1).
--
-- A reservation line (interest_items) can be for several packs of one flavor.
-- The owner may collect payment for some packs before others, so paid state is
-- a COUNT, not a boolean: paid_count is how many packs of that line are paid.
-- Packs of the same flavor are interchangeable, so WHICH pack is paid is not
-- recorded. No money is stored — only how many of the ordered packs are settled.
--
-- Apply in the Supabase SQL Editor after 001–007. Idempotent: safe to re-run.
-- ============================================================================

alter table interest_items
  add column if not exists paid_count integer not null default 0;

-- Re-add the range check idempotently (drop-if-exists guards a re-run without
-- assuming the constraint already exists).
alter table interest_items
  drop constraint if exists interest_items_paid_count_range;

alter table interest_items
  add constraint interest_items_paid_count_range
  check (paid_count >= 0 and paid_count <= quantity);
