-- ABAC website — public "check my status" lookup.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0004_member_number.sql to have been run first.
--
-- No login: matches the original design's "enter any two of your details."
-- Deliberately returns only low-sensitivity fields (status, membership
-- number, expiry) — never CID, phone, or suburb — even though both email
-- and date of birth must match. Email+DOB is not strong authentication (both
-- can be known or guessed by people other than the member), so what this
-- function is willing to reveal is scoped accordingly.
--
-- "Expired" is computed here from expires_at, not read off a stored status
-- column — nothing currently runs on a schedule to flip active → expired,
-- so checking the real date at lookup time is what makes this correct
-- without needing that job to exist yet.
create or replace function public.check_membership_status(p_email text, p_dob date)
returns table (member_no integer, member_year int, effective_status text, expires_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select
    m.member_no,
    extract(year from coalesce(m.joined_at, m.created_at))::int,
    case
      when m.status = 'pending' then 'pending'
      when m.expires_at is not null and m.expires_at < now() then 'expired'
      else 'active'
    end,
    m.expires_at
  from public.members m
  where lower(m.email) = lower(p_email) and m.date_of_birth = p_dob
  limit 1;
$$;
