-- Team members management — admins can add/edit/remove leadership across multiple categories.
-- Requires 0001_events_admin.sql (reuses is_admin() and set_updated_at()).

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null, -- e.g., "President", "Treasurer", "Secretary"
  category text not null check (category in ('executive','founders','advisory','former_presidents')),
  email text, -- optional
  phone text, -- optional
  bio text, -- short description/blurb
  photo_path text, -- public Storage URL
  display_order integer default 0, -- sort within category
  active boolean not null default true, -- show/hide member
  term_start date, -- when they started (optional, for historical tracking)
  term_end date, -- when they ended (optional, for historical tracking)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_team_members_category_active
  on public.team_members(category, active, display_order);

drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at
  before update on public.team_members
  for each row
  execute function public.set_updated_at();

alter table public.team_members enable row level security;

-- Public can read active members only
create policy "Public can read active team members"
  on public.team_members for select
  using (active = true or public.is_admin());

-- Admins can insert
create policy "Admins can insert team members"
  on public.team_members for insert
  with check (public.is_admin());

-- Admins can update
create policy "Admins can update team members"
  on public.team_members for update
  using (public.is_admin())
  with check (public.is_admin());

-- Admins can delete
create policy "Admins can delete team members"
  on public.team_members for delete
  using (public.is_admin());

-- Storage bucket for team member photos (public read, admin-only write)
insert into storage.buckets (id, name, public)
values ('team-photos', 'team-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public can view team photos" on storage.objects;
create policy "Public can view team photos"
  on storage.objects for select
  using (bucket_id = 'team-photos');

drop policy if exists "Admins can upload team photos" on storage.objects;
create policy "Admins can upload team photos"
  on storage.objects for insert
  with check (bucket_id = 'team-photos' and public.is_admin());

drop policy if exists "Admins can update team photos" on storage.objects;
create policy "Admins can update team photos"
  on storage.objects for update
  using (bucket_id = 'team-photos' and public.is_admin());

drop policy if exists "Admins can delete team photos" on storage.objects;
create policy "Admins can delete team photos"
  on storage.objects for delete
  using (bucket_id = 'team-photos' and public.is_admin());
