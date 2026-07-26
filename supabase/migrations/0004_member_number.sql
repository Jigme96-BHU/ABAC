-- ABAC website — human-readable membership numbers.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0003_members.sql to have been run first.

-- Auto-assigned, unique, sequential — never chosen by the client. Displayed
-- as "ABAC-<year>-<member_no padded to 6 digits>", e.g. ABAC-2026-000001
-- (see lib/member-number.ts). Rows inserted before this migration (if any —
-- test data) get backfilled with numbers too, in insertion order.
alter table public.members
  add column if not exists member_no integer generated always as identity;

-- Replaces get_membership_status (0003): same idea, but /join/success needs
-- the membership number too, and the free (under-18) path never has a
-- Stripe session to look up by — it passes the member's own row id instead.
-- Both are effectively unguessable bearer tokens; neither is enumerable.
drop function if exists public.get_membership_status(text);

create or replace function public.get_membership_confirmation(
  p_session_id text default null,
  p_member_id uuid default null
)
returns table (status text, member_no integer, member_year int)
language sql
security definer
set search_path = public
stable
as $$
  select
    m.status,
    m.member_no,
    extract(year from coalesce(m.joined_at, m.created_at))::int
  from public.members m
  where (p_session_id is not null and m.stripe_checkout_session_id = p_session_id)
     or (p_member_id is not null and m.id = p_member_id)
  limit 1;
$$;
