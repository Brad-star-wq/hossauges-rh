-- ============================================================================
-- Hossauges — rate-limit guard for the public reserve form (Session 6)
-- Apply in the Supabase SQL Editor after 001_init.sql. Idempotent.
-- ============================================================================

-- One row per accepted reserve submission, keyed by a salted hash of the
-- caller IP. reserveSubmit counts rows in the trailing hour to enforce 5/hour.
create table if not exists submission_guard (
  id         uuid primary key default gen_random_uuid(),
  ip_hash    text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_guard_ip_time
  on submission_guard (ip_hash, created_at);

-- Service-role only: RLS enabled with NO policies, so anon/authenticated have
-- no access. The reserve server action reads/writes it via the admin client.
alter table submission_guard enable row level security;
