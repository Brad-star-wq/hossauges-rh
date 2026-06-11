-- ============================================================================
-- Hossauges — editable content + About gallery (Round 2)
-- Apply in the Supabase SQL Editor after 001/002. Idempotent.
-- ============================================================================

-- Key/value store for single editable fields (hero photos, about paragraph).
create table if not exists site_content (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

-- Photos + videos shown on the About page gallery.
create table if not exists gallery_items (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('photo', 'video')),
  url        text not null,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_gallery_sort on gallery_items (sort);

-- ── RLS: public read, writes via service role only ───────────────────────────
alter table site_content  enable row level security;
alter table gallery_items enable row level security;

drop policy if exists "site_content public select" on site_content;
create policy "site_content public select"
  on site_content for select to anon, authenticated using (true);

drop policy if exists "gallery_items public select" on gallery_items;
create policy "gallery_items public select"
  on gallery_items for select to anon, authenticated using (true);

-- ── Seed default content keys so pages render before content is added ────────
insert into site_content (key, value) values
  ('home_hero_url', ''),
  ('about_hero_url', ''),
  ('about_paragraph',
   'Hossauges started in 2024 in Columbia, SC. We make about a hundred pounds of small-batch sausage a week, two new flavors at a time. Everything is ground, stuffed, smoked, and packed by hand.')
on conflict (key) do nothing;
