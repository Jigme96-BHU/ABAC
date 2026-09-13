-- ABAC website — soft delete + a 30-day recoverable trash for every /admin
-- delete button.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires every prior migration through 0030 to have been run.
--
-- Until now, "Delete" in /admin was a real, permanent SQL DELETE — the
-- earlier "Deleting… Undo" button only let you cancel *before* that
-- happened, not bring something back afterward. This migration adds a
-- `deleted_at` column to every table with a delete button. The app's
-- delete actions now set this timestamp instead of removing the row, a new
-- restore action clears it, and a daily cron (see
-- app/api/admin/purge-deleted/route.ts) permanently removes anything
-- still soft-deleted after 30 days — at which point its Storage files
-- (photos, videos, certificates, documents) are cleaned up too, since
-- until then a restore might still need them.

-- ---------------------------------------------------------------------------
-- 1. deleted_at columns + indexes
-- ---------------------------------------------------------------------------
alter table public.events add column if not exists deleted_at timestamptz;
alter table public.stories add column if not exists deleted_at timestamptz;
alter table public.documents add column if not exists deleted_at timestamptz;
alter table public.volunteers add column if not exists deleted_at timestamptz;
alter table public.members add column if not exists deleted_at timestamptz;
alter table public.corporate_members add column if not exists deleted_at timestamptz;
alter table public.service_requests add column if not exists deleted_at timestamptz;
alter table public.team_members add column if not exists deleted_at timestamptz;

create index if not exists events_deleted_at_idx on public.events (deleted_at) where deleted_at is not null;
create index if not exists stories_deleted_at_idx on public.stories (deleted_at) where deleted_at is not null;
create index if not exists documents_deleted_at_idx on public.documents (deleted_at) where deleted_at is not null;
create index if not exists volunteers_deleted_at_idx on public.volunteers (deleted_at) where deleted_at is not null;
create index if not exists members_deleted_at_idx on public.members (deleted_at) where deleted_at is not null;
create index if not exists corporate_members_deleted_at_idx on public.corporate_members (deleted_at) where deleted_at is not null;
create index if not exists service_requests_deleted_at_idx on public.service_requests (deleted_at) where deleted_at is not null;
create index if not exists team_members_deleted_at_idx on public.team_members (deleted_at) where deleted_at is not null;

-- ---------------------------------------------------------------------------
-- 2. Public RLS policies — a soft-deleted row must never appear on a public
-- page, even though these policies already OR in `is_admin()` (which stays
-- true regardless of deleted_at, intentionally: admins need to see trashed
-- rows to restore them — see app/admin/actions.ts's new getDeleted* actions,
-- which read the table directly, RLS-permitted the same way the existing
-- admin-only tables already are). Only the four tables with a genuinely
-- public read policy need this; corporate_members and members/volunteers/
-- service_requests have never had a public SELECT policy at all, so a
-- deleted row there was already unreachable by anon requests.
-- ---------------------------------------------------------------------------
drop policy if exists "Public can read published events" on public.events;
create policy "Public can read published events"
  on public.events for select
  using ((published = true and deleted_at is null) or public.is_admin());

drop policy if exists "Public can read published stories" on public.stories;
create policy "Public can read published stories"
  on public.stories for select
  using ((published = true and deleted_at is null) or public.is_admin());

drop policy if exists "Public can read published documents" on public.documents;
create policy "Public can read published documents"
  on public.documents for select
  using ((published = true and deleted_at is null) or public.is_admin());

drop policy if exists "Public can read active team members" on public.team_members;
create policy "Public can read active team members"
  on public.team_members for select
  using ((active = true and deleted_at is null) or public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. get_active_corporate_partners — corporate_members has no public SELECT
-- policy; the "Our Partners" page reads through this SECURITY DEFINER
-- function instead, which must exclude deleted_at itself.
-- ---------------------------------------------------------------------------
drop function if exists public.get_active_corporate_partners();

create or replace function public.get_active_corporate_partners()
returns table (
  business_name text,
  tier text,
  logo_path text,
  website text
)
language sql
security definer
set search_path = public
stable
as $$
  select m.business_name, m.tier, m.logo_path, m.website
  from public.corporate_members m
  where m.status = 'active' and not m.hidden_from_partners and m.deleted_at is null
  order by case m.tier when 'diamond' then 1 when 'platinum' then 2 else 3 end, m.business_name;
$$;

-- ---------------------------------------------------------------------------
-- 4. Expiry-reminder cron — a soft-deleted member/corporate member must
-- never get a "your membership is expiring" email.
-- ---------------------------------------------------------------------------
drop function if exists public.get_members_due_for_expiry_reminders(date);

create or replace function public.get_members_due_for_expiry_reminders(p_today date default current_date)
returns table (
  member_id uuid,
  email text,
  name text,
  member_no integer,
  member_year int,
  expires_at timestamptz,
  reminder_kind text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    m.id as member_id,
    m.email,
    m.name,
    m.member_no,
    extract(year from coalesce(m.joined_at, m.created_at))::int as member_year,
    m.expires_at,
    '14d' as reminder_kind
  from public.members m
  where m.status = 'active'
    and m.deleted_at is null
    and m.expires_at is not null
    and m.expires_at::date = p_today + 14
    and m.expiry_reminder_14d_sent_at is null

  union all

  select
    m.id as member_id,
    m.email,
    m.name,
    m.member_no,
    extract(year from coalesce(m.joined_at, m.created_at))::int as member_year,
    m.expires_at,
    'expired' as reminder_kind
  from public.members m
  where m.status = 'active'
    and m.deleted_at is null
    and m.expires_at is not null
    and m.expires_at::date <= p_today
    and m.expiry_reminder_expired_sent_at is null
  order by expires_at, member_id, reminder_kind;
$$;

-- ---------------------------------------------------------------------------
-- 5. "What will be purged" getters — read-only, for the purge route to know
-- which Storage files to clean up before it hard-deletes the rows that
-- reference them. Only tables with file columns need one; events,
-- volunteers, and members have none.
-- ---------------------------------------------------------------------------
create or replace function public.get_expired_stories(p_cutoff timestamptz)
returns table (id uuid, image_path text, video_path text, gallery_paths text[])
language sql
security definer
set search_path = public
stable
as $$
  select
    s.id,
    s.image_path,
    s.video_path,
    coalesce((select array_agg(si.path) from public.story_images si where si.story_id = s.id), '{}')
  from public.stories s
  where s.deleted_at is not null and s.deleted_at < p_cutoff;
$$;

create or replace function public.get_expired_documents(p_cutoff timestamptz)
returns table (id uuid, file_path text)
language sql
security definer
set search_path = public
stable
as $$
  select d.id, d.file_path
  from public.documents d
  where d.deleted_at is not null and d.deleted_at < p_cutoff;
$$;

create or replace function public.get_expired_team_members(p_cutoff timestamptz)
returns table (id uuid, photo_path text)
language sql
security definer
set search_path = public
stable
as $$
  select t.id, t.photo_path
  from public.team_members t
  where t.deleted_at is not null and t.deleted_at < p_cutoff;
$$;

create or replace function public.get_expired_corporate_members(p_cutoff timestamptz)
returns table (id uuid, logo_path text, business_certificate_path text)
language sql
security definer
set search_path = public
stable
as $$
  select c.id, c.logo_path, c.business_certificate_path
  from public.corporate_members c
  where c.deleted_at is not null and c.deleted_at < p_cutoff;
$$;

create or replace function public.get_expired_service_requests(p_cutoff timestamptz)
returns table (
  id uuid,
  passport_path text,
  visa_path text,
  photo_id_path text,
  proof_of_residency_path text
)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.passport_path, r.visa_path, r.photo_id_path, r.proof_of_residency_path
  from public.service_requests r
  where r.deleted_at is not null and r.deleted_at < p_cutoff;
$$;

-- ---------------------------------------------------------------------------
-- 6. The actual purge — hard-deletes anything soft-deleted before the
-- cutoff, across all 8 tables. FK cascades already in place (member_checkouts
-- → members, story_images → stories, event_rsvps → events) take care of
-- each row's dependents automatically. SECURITY DEFINER because the cron
-- route calling this has no signed-in admin session at all.
-- ---------------------------------------------------------------------------
create or replace function public.purge_expired_soft_deletes(p_cutoff timestamptz default now() - interval '30 days')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.events where deleted_at is not null and deleted_at < p_cutoff;
  delete from public.stories where deleted_at is not null and deleted_at < p_cutoff;
  delete from public.documents where deleted_at is not null and deleted_at < p_cutoff;
  delete from public.volunteers where deleted_at is not null and deleted_at < p_cutoff;
  delete from public.members where deleted_at is not null and deleted_at < p_cutoff;
  delete from public.corporate_members where deleted_at is not null and deleted_at < p_cutoff;
  delete from public.service_requests where deleted_at is not null and deleted_at < p_cutoff;
  delete from public.team_members where deleted_at is not null and deleted_at < p_cutoff;
end;
$$;
