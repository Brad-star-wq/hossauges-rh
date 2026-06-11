-- ============================================================================
-- Hossauges — pre-order pop-up (Round 5). Separate from the weekly batch.
-- Apply in the Supabase SQL Editor after 001–004. Idempotent.
-- ============================================================================

-- Single config row (id is always 1).
create table if not exists preorder_popup (
  id         int primary key default 1,
  enabled    boolean not null default false,
  title      text not null default '',
  updated_at timestamptz not null default now(),
  constraint preorder_popup_singleton check (id = 1)
);

create table if not exists preorder_items (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  photo_url  text,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_preorder_items_sort on preorder_items (sort);

create table if not exists preorder_signups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    text not null,
  items      text, -- selected item names / notes
  contacted  boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- popup + items: public read. signups: public insert only (no read). All owner
-- writes go through the service-role client, which bypasses RLS.
alter table preorder_popup   enable row level security;
alter table preorder_items   enable row level security;
alter table preorder_signups enable row level security;

drop policy if exists "preorder_popup public select" on preorder_popup;
create policy "preorder_popup public select"
  on preorder_popup for select to anon, authenticated using (true);

drop policy if exists "preorder_items public select" on preorder_items;
create policy "preorder_items public select"
  on preorder_items for select to anon, authenticated using (true);

drop policy if exists "preorder_signups public insert" on preorder_signups;
create policy "preorder_signups public insert"
  on preorder_signups for insert to anon, authenticated with check (true);

-- ── Seed the singleton config row (disabled) so it always exists ─────────────
insert into preorder_popup (id, enabled, title)
values (1, false, 'Holiday Pre-Order')
on conflict (id) do nothing;
