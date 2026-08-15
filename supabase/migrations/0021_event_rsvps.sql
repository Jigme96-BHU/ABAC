-- ABAC website — Events RSVP.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0001_events_admin.sql to have been run first.
--
-- The public RSVP button has been permanently disabled since before
-- payments went live ("Available once memberships go live" — see
-- components/EventRow.tsx). This is the real thing: a plain public-insert
-- table, same anti-tamper shape as volunteers (no fee/status to fake, so no
-- narrower check needed than `with check (true)`).

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create index if not exists event_rsvps_event_id_idx on public.event_rsvps (event_id);

-- One RSVP per email per event — a second attempt with the same email hits
-- Postgres error 23505, which app/events/actions.ts turns into a friendly
-- "you've already RSVPed" message rather than a duplicate row.
create unique index if not exists event_rsvps_event_email_idx on public.event_rsvps (event_id, lower(email));

alter table public.event_rsvps enable row level security;

drop policy if exists "Public can RSVP to an event" on public.event_rsvps;
create policy "Public can RSVP to an event"
  on public.event_rsvps for insert
  with check (true);

drop policy if exists "Admins can view rsvps" on public.event_rsvps;
create policy "Admins can view rsvps"
  on public.event_rsvps for select
  using (public.is_admin());

drop policy if exists "Admins can delete rsvps" on public.event_rsvps;
create policy "Admins can delete rsvps"
  on public.event_rsvps for delete
  using (public.is_admin());
