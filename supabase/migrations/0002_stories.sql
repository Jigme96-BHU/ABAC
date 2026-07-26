-- ABAC website — stories table + storage bucket for photos + RLS.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0001_events_admin.sql to have been run first (reuses its
-- public.is_admin() function and public.set_updated_at() trigger function).
-- Safe to re-run if something fails partway through.

-- ---------------------------------------------------------------------------
-- stories
-- ---------------------------------------------------------------------------
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  date date not null,
  excerpt text not null,
  body text not null,
  image_path text,
  image_width integer,
  image_height integer,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stories_date_idx on public.stories (date);

drop trigger if exists stories_set_updated_at on public.stories;
create trigger stories_set_updated_at
  before update on public.stories
  for each row
  execute function public.set_updated_at();

alter table public.stories enable row level security;

drop policy if exists "Public can read published stories" on public.stories;
create policy "Public can read published stories"
  on public.stories for select
  using (published = true or public.is_admin());

drop policy if exists "Admins can insert stories" on public.stories;
create policy "Admins can insert stories"
  on public.stories for insert
  with check (public.is_admin());

drop policy if exists "Admins can update stories" on public.stories;
create policy "Admins can update stories"
  on public.stories for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete stories" on public.stories;
create policy "Admins can delete stories"
  on public.stories for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- storage — a public bucket for story photos. Public read (anyone can view
-- the images, same as any other image on the site); writes restricted to
-- admins via the same is_admin() allowlist.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('story-images', 'story-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view story images" on storage.objects;
create policy "Public can view story images"
  on storage.objects for select
  using (bucket_id = 'story-images');

drop policy if exists "Admins can upload story images" on storage.objects;
create policy "Admins can upload story images"
  on storage.objects for insert
  with check (bucket_id = 'story-images' and public.is_admin());

drop policy if exists "Admins can update story images" on storage.objects;
create policy "Admins can update story images"
  on storage.objects for update
  using (bucket_id = 'story-images' and public.is_admin());

drop policy if exists "Admins can delete story images" on storage.objects;
create policy "Admins can delete story images"
  on storage.objects for delete
  using (bucket_id = 'story-images' and public.is_admin());
