-- ABAC website — Family Membership category.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0007_membership_renewals.sql and
-- 0008_membership_expiry_reminders.sql to have been run first.
--
-- Per the 2026 Membership Policy (§2.2, §3.4): Family Membership covers
-- parent(s) and dependent children under 18 for a flat $30/year (vs $20/year
-- for a Single adult). Each adult is individually recorded in the Register
-- of Members with their own DOB/CID — same eligibility/renewal rules as a
-- Single member — while children are recorded too (name/DOB/CID) but never
-- pay, never vote, and never receive their own email.
--
-- household_id links the rows submitted together in one Family registration.
-- It is not a stable "household" concept carried across years — it's only
-- used to activate everyone paid for by one Stripe Checkout Session at once.
-- Each person's permanent identity is still their own member_no, unlocked by
-- the same DOB+CID match already used for Single renewals.

alter table public.members
  add column if not exists household_id uuid,
  add column if not exists membership_type text not null default 'single'
    check (membership_type in ('single', 'family')),
  add column if not exists is_dependent boolean not null default false;

create index if not exists members_household_idx
  on public.members (household_id);

alter table public.member_checkouts
  add column if not exists household_id uuid;

create index if not exists member_checkouts_household_idx
  on public.member_checkouts (household_id);

-- ---------------------------------------------------------------------------
-- submit_family_registration — the Family equivalent of
-- submit_membership_registration (0007), left untouched for Single so its
-- already-working renewal logic can't regress. Takes every person in the
-- household as one jsonb array and applies the same DOB+CID match-or-insert
-- rule to each, inside one transaction, then records a single
-- member_checkouts row (keyed by the one Stripe session) covering the whole
-- household via household_id. Family is never free — status always stays
-- 'pending' until the webhook activates the household together.
-- ---------------------------------------------------------------------------
drop function if exists public.submit_family_registration(uuid, text, integer, jsonb);

create or replace function public.submit_family_registration(
  p_household_id uuid,
  p_session_id text,
  p_fee_cents integer,
  p_members jsonb
)
returns table (
  member_id uuid,
  is_renewal boolean,
  name text,
  member_no integer,
  member_year int,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_member public.members%rowtype;
  v_now timestamptz := now();
  v_primary_id uuid;
  v_any_renewal boolean := false;
  v_is_renewal boolean;
begin
  if p_session_id is null or trim(p_session_id) = '' then
    raise exception 'Stripe Checkout Session id is required for a family registration';
  end if;

  for v_item in
    select * from jsonb_to_recordset(p_members)
      as x(member_id uuid, email text, name text, gender text, dob date, cid text, phone text, suburb text)
  loop
    v_is_renewal := false;

    select *
    into v_member
    from public.members m
    where m.date_of_birth = v_item.dob
      and m.cid = trim(v_item.cid)
    order by coalesce(m.joined_at, m.created_at), m.created_at
    limit 1;

    if found then
      v_is_renewal := true;
      v_any_renewal := true;

      -- Renewing members keep their current status untouched (it may
      -- already be 'active' from last year, and shouldn't be downgraded
      -- just because a new checkout started) — same rule as
      -- submit_membership_registration's renewal branch.
      update public.members
      set email = trim(v_item.email),
          name = trim(v_item.name),
          gender = nullif(trim(coalesce(v_item.gender, '')), ''),
          phone = nullif(trim(coalesce(v_item.phone, '')), ''),
          suburb = nullif(trim(coalesce(v_item.suburb, '')), ''),
          household_id = p_household_id,
          membership_type = 'family',
          is_dependent = (extract(year from age(v_item.dob)) < 18),
          updated_at = v_now
      where id = v_member.id
      returning * into v_member;
    else
      insert into public.members (
        id, email, name, gender, date_of_birth, cid, phone, suburb,
        fee_cents, status, household_id, membership_type, is_dependent
      )
      values (
        coalesce(v_item.member_id, gen_random_uuid()),
        trim(v_item.email),
        trim(v_item.name),
        nullif(trim(coalesce(v_item.gender, '')), ''),
        v_item.dob,
        trim(v_item.cid),
        nullif(trim(coalesce(v_item.phone, '')), ''),
        nullif(trim(coalesce(v_item.suburb, '')), ''),
        0,
        'pending',
        p_household_id,
        'family',
        (extract(year from age(v_item.dob)) < 18)
      )
      returning * into v_member;
    end if;

    if v_primary_id is null then
      v_primary_id := v_member.id;
    end if;

    member_id := v_member.id;
    is_renewal := v_is_renewal;
    name := v_member.name;
    member_no := v_member.member_no;
    member_year := extract(year from coalesce(v_member.joined_at, v_member.created_at))::int;
    expires_at := v_member.expires_at;
    return next;
  end loop;

  insert into public.member_checkouts (
    stripe_checkout_session_id, member_id, household_id, kind, fee_cents, status
  )
  values (
    p_session_id,
    v_primary_id,
    p_household_id,
    case when v_any_renewal then 'renewal' else 'new' end,
    p_fee_cents,
    'pending'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- activate_membership_checkout — extended to activate an entire household at
-- once (one row per person) when the checkout has a household_id, instead of
-- just the one member_id. Single-membership checkouts (household_id null)
-- behave exactly as before, still returning exactly one row.
-- ---------------------------------------------------------------------------
drop function if exists public.activate_membership_checkout(text);

create or replace function public.activate_membership_checkout(p_session_id text)
returns table (
  did_activate boolean,
  notification_kind text,
  membership_type text,
  is_dependent boolean,
  household_id uuid,
  member_id uuid,
  email text,
  name text,
  member_no integer,
  member_year int,
  fee_cents integer,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checkout public.member_checkouts%rowtype;
  v_member public.members%rowtype;
  v_now timestamptz := now();
begin
  update public.member_checkouts c
  set status = 'paid',
      paid_at = v_now
  where c.stripe_checkout_session_id = p_session_id
    and c.status = 'pending'
  returning * into v_checkout;

  if not found then
    did_activate := false;
    return next;
    return;
  end if;

  if v_checkout.household_id is not null then
    for v_member in
      update public.members m
      set status = 'active',
          joined_at = coalesce(m.joined_at, v_now),
          expires_at = greatest(coalesce(m.expires_at, v_now), v_now) + interval '1 year',
          updated_at = v_now
      where m.household_id = v_checkout.household_id
      returning *
    loop
      did_activate := true;
      notification_kind := v_checkout.kind;
      membership_type := v_member.membership_type;
      is_dependent := v_member.is_dependent;
      household_id := v_checkout.household_id;
      member_id := v_member.id;
      email := v_member.email;
      name := v_member.name;
      member_no := v_member.member_no;
      member_year := extract(year from coalesce(v_member.joined_at, v_member.created_at))::int;
      fee_cents := v_checkout.fee_cents;
      expires_at := v_member.expires_at;
      return next;
    end loop;
    return;
  end if;

  update public.members m
  set status = 'active',
      joined_at = coalesce(m.joined_at, v_now),
      expires_at = greatest(coalesce(m.expires_at, v_now), v_now) + interval '1 year',
      updated_at = v_now
  where m.id = v_checkout.member_id
  returning * into v_member;

  did_activate := true;
  notification_kind := v_checkout.kind;
  membership_type := v_member.membership_type;
  is_dependent := v_member.is_dependent;
  household_id := null;
  member_id := v_member.id;
  email := v_member.email;
  name := v_member.name;
  member_no := v_member.member_no;
  member_year := extract(year from coalesce(v_member.joined_at, v_member.created_at))::int;
  fee_cents := v_checkout.fee_cents;
  expires_at := v_member.expires_at;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_membership_confirmation — extended so /join/success can show every
-- household member (name + membership number) for a Family registration,
-- instead of just one row. Single-membership lookups are unaffected: they
-- never have a household_id, so they still return exactly one row.
-- ---------------------------------------------------------------------------
drop function if exists public.get_membership_confirmation(text, uuid);

create or replace function public.get_membership_confirmation(
  p_session_id text default null,
  p_member_id uuid default null
)
returns table (
  status text,
  member_no integer,
  member_year int,
  name text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_household_id uuid;
  v_checkout_status text;
begin
  if p_session_id is not null then
    select c.household_id, c.status
    into v_household_id, v_checkout_status
    from public.member_checkouts c
    where c.stripe_checkout_session_id = p_session_id;
  end if;

  if v_household_id is not null then
    return query
      select
        case when v_checkout_status = 'paid' then 'active' else 'pending' end,
        m.member_no,
        extract(year from coalesce(m.joined_at, m.created_at))::int,
        m.name
      from public.members m
      where m.household_id = v_household_id
      order by m.is_dependent, m.created_at;
    return;
  end if;

  if p_session_id is not null then
    if exists (select 1 from public.member_checkouts c where c.stripe_checkout_session_id = p_session_id) then
      return query
        select
          case when c.status = 'paid' then 'active' else 'pending' end,
          m.member_no,
          extract(year from coalesce(m.joined_at, m.created_at))::int,
          m.name
        from public.member_checkouts c
        join public.members m on m.id = c.member_id
        where c.stripe_checkout_session_id = p_session_id;
      return;
    end if;

    -- Backward compatibility: registrations from before member_checkouts
    -- existed, when the Stripe Checkout Session id lived directly on members.
    if exists (select 1 from public.members m where m.stripe_checkout_session_id = p_session_id) then
      return query
        select m.status, m.member_no, extract(year from coalesce(m.joined_at, m.created_at))::int, m.name
        from public.members m
        where m.stripe_checkout_session_id = p_session_id;
      return;
    end if;
  end if;

  if p_member_id is not null then
    return query
      select m.status, m.member_no, extract(year from coalesce(m.joined_at, m.created_at))::int, m.name
      from public.members m
      where m.id = p_member_id;
  end if;
end;
$$;
