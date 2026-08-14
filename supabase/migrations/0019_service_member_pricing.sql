-- ABAC website — member vs non-member pricing for Service Requests, and the
-- membership-number lookup that drives it.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0013_service_requests.sql and 0004_member_number.sql.
--
-- Members pay $10 per service; non-members pay $45. Which rate applies is
-- decided in the database (see lookup_member_for_service below) and re-checked
-- server-side at submit time — the browser only ever *displays* a price, it
-- never gets to choose one.

-- ---------------------------------------------------------------------------
-- service_requests — remember who claimed the member rate, so the committee
-- can reconcile a $10 charge against a real membership.
-- ---------------------------------------------------------------------------
alter table public.service_requests
  add column if not exists member_no integer,
  add column if not exists is_member boolean not null default false;

-- The "License (if applicable)" upload became "Proof of ID (Australian Driving
-- Licence / Photo ID)" and is now required. Renaming rather than adding a
-- column keeps the documents already uploaded against existing requests.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_requests'
      and column_name = 'license_path'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_requests'
      and column_name = 'photo_id_path'
  ) then
    alter table public.service_requests rename column license_path to photo_id_path;
  end if;
end
$$;

alter table public.service_requests
  add column if not exists photo_id_path text;

-- ---------------------------------------------------------------------------
-- lookup_member_for_service — confirms a membership number belongs to a real,
-- currently active member, and returns just enough for the requester to
-- recognise their own record.
--
-- PRIVACY NOTE: membership numbers are a sequential identity column, so they
-- are trivially guessable (…000123 implies …000124 exists). This function is
-- therefore deliberately stingy: it returns the member's name and a MASKED
-- email ("le•••@gmail.com"), never the full address, so that walking the
-- number space cannot harvest a mailing list. It exposes no DOB, CID, phone
-- or suburb. Widening what this returns would turn a guessable integer into a
-- member directory — don't, without the committee weighing that trade-off.
-- ---------------------------------------------------------------------------
drop function if exists public.lookup_member_for_service(integer);

create or replace function public.lookup_member_for_service(p_member_no integer)
returns table (
  -- Not named "found": an OUT parameter by that name shadows PL/pgSQL's
  -- built-in FOUND (see 0014 for the same trap).
  member_found boolean,
  eligible boolean,
  reason text,
  name text,
  email_masked text,
  member_no integer,
  member_year int
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_member public.members%rowtype;
  v_local text;
  v_domain text;
begin
  member_found := false;
  eligible := false;

  if p_member_no is null then
    reason := 'not_found';
    return next;
    return;
  end if;

  select * into v_member
  from public.members m
  where m.member_no = p_member_no;

  if not found then
    reason := 'not_found';
    return next;
    return;
  end if;

  member_found := true;
  name := v_member.name;
  member_no := v_member.member_no;
  member_year := extract(year from coalesce(v_member.joined_at, v_member.created_at))::int;

  v_local := split_part(v_member.email, '@', 1);
  v_domain := split_part(v_member.email, '@', 2);
  email_masked := left(v_local, 2) || '•••@' || v_domain;

  if v_member.status <> 'active' then
    reason := 'not_active';
    return next;
    return;
  end if;

  if v_member.expires_at is not null and v_member.expires_at < now() then
    reason := 'expired';
    return next;
    return;
  end if;

  eligible := true;
  return next;
end;
$$;
