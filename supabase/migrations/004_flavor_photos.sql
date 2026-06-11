-- ============================================================================
-- Hossauges — multiple photos per flavor (Round 4)
-- Apply in the Supabase SQL Editor after 001–003. Idempotent.
-- ============================================================================

create table if not exists flavor_photos (
  id         uuid primary key default gen_random_uuid(),
  flavor_id  uuid not null references drop_flavors (id) on delete cascade,
  url        text not null,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_flavor_photos_flavor on flavor_photos (flavor_id, sort);

-- ── RLS: public read, writes via service role only ───────────────────────────
alter table flavor_photos enable row level security;

drop policy if exists "flavor_photos public select" on flavor_photos;
create policy "flavor_photos public select"
  on flavor_photos for select to anon, authenticated using (true);

-- ── Migrate the existing single photo_url into the table (idempotent) ────────
-- Each flavor that already has a photo gets one flavor_photos row at sort 0.
insert into flavor_photos (flavor_id, url, sort)
select df.id, df.photo_url, 0
from drop_flavors df
where df.photo_url is not null
  and df.photo_url <> ''
  and not exists (select 1 from flavor_photos fp where fp.flavor_id = df.id);
