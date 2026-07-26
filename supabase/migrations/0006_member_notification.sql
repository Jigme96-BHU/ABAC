-- ABAC website — lookup used to send the welcome email after payment.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0003_members.sql to have been run first.
--
-- The Stripe webhook (app/api/stripe/webhook) only has a Checkout Session id
-- to work with — it needs the member's email, name, membership number, fee
-- and expiry to compose the welcome email. Deliberately its own narrow
-- function rather than extending get_membership_confirmation: that one is
-- called from the browser (the member looking at their own confirmation),
-- this one is called server-to-server from the webhook, and the two have no
-- reason to share a signature just because they query similar columns.
--
-- The explicit DROP matters: Postgres's CREATE OR REPLACE cannot change a
-- function's return columns on its own (adding fee_cents/expires_at here
-- counts as a return-type change) — without the drop, re-running this file
-- against a database that already has the 4-column version silently keeps
-- serving the old one, which is exactly what caused the welcome email to
-- show "$NaN" and "—" for fee and expiry.
drop function if exists public.get_member_for_notification(text);

create or replace function public.get_member_for_notification(p_session_id text)
returns table (
  email text,
  name text,
  member_no integer,
  member_year int,
  fee_cents integer,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    m.email,
    m.name,
    m.member_no,
    extract(year from coalesce(m.joined_at, m.created_at))::int,
    m.fee_cents,
    m.expires_at
  from public.members m
  where m.stripe_checkout_session_id = p_session_id
  limit 1;
$$;
