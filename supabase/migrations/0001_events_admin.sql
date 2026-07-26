-- ABAC website — events table + admin allowlist + RLS.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. It's safe to re-run (every statement is idempotent) if something
-- fails partway through.
--
-- Edit the email(s) in the "seed admins" block at the bottom before running,
-- or run the rest first and add admins later via Table Editor → admins.

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time text,
  location text not null,
  note text,
  access text not null default 'open' check (access in ('open', 'members')),
  cta text check (cta in ('rsvp', 'volunteer')),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_date_idx on public.events (date);

-- keep updated_at current on every edit
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row
  execute function public.set_updated_at();

alter table public.events enable row level security;

-- ---------------------------------------------------------------------------
-- admins — allowlist of emails that may sign in to /admin and manage events.
-- No RLS policies are defined for this table, which means no role (anon,
-- authenticated) can read or write it directly. Only the SECURITY DEFINER
-- function below can see it, so the list of committee emails never leaks
-- through the API.
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admins where email = (auth.jwt() ->> 'email')
  );
$$;

-- ---------------------------------------------------------------------------
-- policies
-- ---------------------------------------------------------------------------
drop policy if exists "Public can read published events" on public.events;
create policy "Public can read published events"
  on public.events for select
  using (published = true or public.is_admin());

drop policy if exists "Admins can insert events" on public.events;
create policy "Admins can insert events"
  on public.events for insert
  with check (public.is_admin());

drop policy if exists "Admins can update events" on public.events;
create policy "Admins can update events"
  on public.events for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
  on public.events for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- seed admins — EDIT THIS before running, or skip and add rows later via
-- Table Editor → admins. Add one email per line.
-- ---------------------------------------------------------------------------
insert into public.admins (email) values
  ('bhutancanberra@gmail.com')
on conflict (email) do nothing;
