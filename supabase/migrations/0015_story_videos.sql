-- Add video support to stories — each story can now have an optional video
-- in addition to the existing image (or instead of, both optional).
-- Requires 0002_stories.sql to have been run first.
alter table public.stories
  add column video_path text,
  add column video_size integer, -- bytes, for admin dashboard display
  add column video_duration integer; -- seconds, for frontend display

-- Indexes for queries (same pattern as image_path)
create index if not exists idx_stories_video_path on public.stories(video_path) where video_path is not null;

-- Storage bucket for story videos (public read, admin-only write — same pattern as story-images)
insert into storage.buckets (id, name, public)
values ('story-videos', 'story-videos', true)
on conflict (id) do nothing;

drop policy if exists "Public can view story videos" on storage.objects;
create policy "Public can view story videos"
  on storage.objects for select
  using (bucket_id = 'story-videos');

drop policy if exists "Admins can upload story videos" on storage.objects;
create policy "Admins can upload story videos"
  on storage.objects for insert
  with check (bucket_id = 'story-videos' and public.is_admin());

drop policy if exists "Admins can update story videos" on storage.objects;
create policy "Admins can update story videos"
  on storage.objects for update
  using (bucket_id = 'story-videos' and public.is_admin());

drop policy if exists "Admins can delete story videos" on storage.objects;
create policy "Admins can delete story videos"
  on storage.objects for delete
  using (bucket_id = 'story-videos' and public.is_admin());
