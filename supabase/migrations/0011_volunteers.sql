-- ABAC website — volunteer registrations + RLS.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0001_events_admin.sql to have been run first (reuses its
-- public.is_admin() function and public.set_updated_at() trigger function).
-- Independent of the membership migrations (0003–0009).

-- ---------------------------------------------------------------------------
-- volunteers — holds real PII (CID, date of birth, phone, guardian contact
-- details for minors). Same security model as members: no SELECT policy for
-- anon/authenticated — only admins can read this table, and only through the
-- RLS policy below, never a public API response.
-- ---------------------------------------------------------------------------
create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sex text not null,
  date_of_birth date not null,
  cid text not null,
  phone text not null,
  email text not null,
  is_minor boolean not null default false,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  guardian_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists volunteers_set_updated_at on public.volunteers;
create trigger volunteers_set_updated_at
  before update on public.volunteers
  for each row
  execute function public.set_updated_at();

alter table public.volunteers enable row level security;

-- Anyone can submit the volunteer registration form — that's the entry
-- point, there's no account to be signed into. Nothing here is a
-- server-authority field (no fee/status to fake), so a plain insert-only
-- policy is enough, unlike members' narrower "pending or free" check.
drop policy if exists "Public can register as a volunteer" on public.volunteers;
create policy "Public can register as a volunteer"
  on public.volunteers for insert
  with check (true);

drop policy if exists "Admins can view volunteers" on public.volunteers;
create policy "Admins can view volunteers"
  on public.volunteers for select
  using (public.is_admin());

drop policy if exists "Admins can update volunteers" on public.volunteers;
create policy "Admins can update volunteers"
  on public.volunteers for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete volunteers" on public.volunteers;
create policy "Admins can delete volunteers"
  on public.volunteers for delete
  using (public.is_admin());
