-- ABAC website — multiple images per story.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0002_stories.sql to have been run first.
--
-- stories.image_path/image_width/image_height are left untouched and always
-- mirror story_images row 0 (the "cover") — StoryCard.tsx's grid thumbnails
-- and any OG image keep working exactly as before. The story detail page
-- additionally renders every row in story_images, in display_order.

create table if not exists public.story_images (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  path text not null, -- public Storage URL in the existing story-images bucket
  width integer,
  height integer,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists story_images_story_id_idx on public.story_images (story_id, display_order);

alter table public.story_images enable row level security;

-- Stories themselves are publicly readable content (no admin gate on select
-- anywhere in 0002_stories.sql) — the gallery images are the same.
drop policy if exists "Public can view story images" on public.story_images;
create policy "Public can view story images"
  on public.story_images for select
  using (true);

drop policy if exists "Admins can insert story images" on public.story_images;
create policy "Admins can insert story images"
  on public.story_images for insert
  with check (public.is_admin());

drop policy if exists "Admins can update story images" on public.story_images;
create policy "Admins can update story images"
  on public.story_images for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete story images" on public.story_images;
create policy "Admins can delete story images"
  on public.story_images for delete
  using (public.is_admin());
