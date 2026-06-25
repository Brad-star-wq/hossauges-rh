-- ============================================================================
-- Hossauges — multi-flavor reserve (Round 9). A reservation can now contain
-- several flavors, each with its own quantity, in ONE submission.
--
-- Model: interest_submissions stays the PARENT (name, contact, drop, contacted,
-- created_at). Each chosen flavor becomes a child row in interest_items. Old
-- single-flavor rows keep their legacy flavor_id/quantity columns and still
-- display (the dashboard reads line items, falling back to the legacy columns).
--
-- Apply in the Supabase SQL Editor after 001–006. Idempotent.
-- ============================================================================

-- Per-flavor line items for a reservation.
create table if not exists interest_items (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references interest_submissions (id) on delete cascade,
  flavor_id     uuid references drop_flavors (id) on delete set null,
  flavor_name   text not null,                 -- snapshot, survives flavor edits/deletes
  quantity      int  not null check (quantity > 0),
  created_at    timestamptz not null default now()
);

create index if not exists idx_interest_items_submission on interest_items (submission_id);

-- New multi-flavor parents carry no single flavor/quantity — relax the old
-- NOT NULL so the parent can omit them. (flavor_id is already nullable.)
alter table interest_submissions alter column quantity drop not null;

-- RLS: writes happen via the service-role server action (which bypasses RLS),
-- and reads are admin-only via the service role. So enable RLS with NO policies
-- — anon gets neither read nor write. (Stricter than the parent's public-insert
-- policy, which is fine: the public never touches interest_items directly.)
alter table interest_items enable row level security;
