-- ============================================================================
-- Hossauges — initial schema, RLS, and storage (SPEC §5)
-- Apply once to a fresh Supabase project via the SQL Editor (or psql).
-- Idempotent: safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS guards).
-- ============================================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists drops (
  id           uuid primary key default gen_random_uuid(),
  week_label   text not null,
  status       text not null check (status in ('active', 'archived')),
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists drop_flavors (
  id          uuid primary key default gen_random_uuid(),
  drop_id     uuid not null references drops (id) on delete cascade,
  name        text not null,
  meat_type   text not null check (meat_type in ('pork', 'beef_pork')),
  description text,
  price_cents int,
  sold_out    boolean not null default false,
  photo_url   text,
  votes       int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists merch_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price_cents int,
  sizes_note  text,
  photo_url   text,
  square_link text,
  active      boolean not null default true,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists interest_submissions (
  id         uuid primary key default gen_random_uuid(),
  drop_id    uuid references drops (id) on delete set null,
  flavor_id  uuid references drop_flavors (id) on delete set null,
  name       text not null,
  contact    text not null,
  quantity   int not null,
  contacted  boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists email_list (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- ── Indexes (SPEC §5) ─────────────────────────────────────────────────────────
create index if not exists idx_drops_status            on drops (status);
create index if not exists idx_subs_drop_id            on interest_submissions (drop_id);
create index if not exists idx_merch_active            on merch_items (active);
-- Helps getActiveDrop() join flavors to their drop.
create index if not exists idx_drop_flavors_drop_id    on drop_flavors (drop_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- service_role bypasses RLS entirely, so all admin writes (via server actions)
-- work without explicit policies. The anon/authenticated roles get ONLY what's
-- declared below; everything else (writes to drops/drop_flavors/merch_items,
-- any read of interest_submissions/email_list) is denied by default.

alter table drops                enable row level security;
alter table drop_flavors         enable row level security;
alter table merch_items          enable row level security;
alter table interest_submissions enable row level security;
alter table email_list           enable row level security;

-- Public reads
drop policy if exists "drops public select" on drops;
create policy "drops public select"
  on drops for select to anon, authenticated using (true);

drop policy if exists "drop_flavors public select" on drop_flavors;
create policy "drop_flavors public select"
  on drop_flavors for select to anon, authenticated using (true);

-- Merch: only active items are publicly readable
drop policy if exists "merch_items public select active" on merch_items;
create policy "merch_items public select active"
  on merch_items for select to anon, authenticated using (active = true);

-- Public inserts only (no select policy => reads denied)
drop policy if exists "interest_submissions public insert" on interest_submissions;
create policy "interest_submissions public insert"
  on interest_submissions for insert to anon, authenticated with check (true);

drop policy if exists "email_list public insert" on email_list;
create policy "email_list public insert"
  on email_list for insert to anon, authenticated with check (true);

-- ── Storage: photos bucket (public read, writes via service role only) ─────────
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

-- Public bucket => objects are readable through their public URL. No anon
-- insert/update/delete policies on storage.objects, so uploads require the
-- service-role client (Session 7 admin photo upload).
drop policy if exists "photos public read" on storage.objects;
create policy "photos public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'photos');
