-- ABAC website — mid-term membership category switching (Single <-> Family).
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0009_family_membership.sql to have been run first.
--
-- Pricing model (committee decision, "model A"): switching keeps the member's
-- existing renewal date and charges only the difference in annual rate for the
-- days they have left:
--
--     amount_due = (target_annual_fee - current_annual_fee) * days_left / 365
--
-- floored at zero. Worked example — a Single member who joined 1 January for
-- $20 switches to Family on 1 April with 275 days left:
--     (3000 - 2000) * 275/365 = 753 cents = $7.53, expiry stays 1 January.
--
-- Two properties follow from anchoring on the existing expiry rather than
-- restarting the year:
--   * The whole household lands on one renewal date, and that date does not
--     drift when someone switches — unlike a plain Family registration, which
--     extends each person from their own expiry and leaves a household with
--     mismatched dates.
--   * Family -> Single needs no special case. The rate difference is negative,
--     so it clamps to $0 due with the expiry untouched: no refund, no
--     stranded credit, no negative charge for Stripe to reject.
--
-- Fee constants are passed in by the server action (app/join/actions.ts) rather
-- than duplicated here, so the quote and the amount actually charged can never
-- drift apart.

-- ---------------------------------------------------------------------------
-- Schema: a switch is a third kind of checkout, and it has to remember what it
-- is switching *to* — the type change is applied on payment, never at submit
-- time, so an abandoned Stripe checkout leaves the member as they were.
-- ---------------------------------------------------------------------------
alter table public.member_checkouts
  drop constraint if exists member_checkouts_kind_check;

alter table public.member_checkouts
  add constraint member_checkouts_kind_check
    check (kind in ('new', 'renewal', 'switch'));

alter table public.member_checkouts
  add column if not exists switch_to_type text
    check (switch_to_type is null or switch_to_type in ('single', 'family')),
  add column if not exists anchor_expires_at timestamptz;

-- ---------------------------------------------------------------------------
-- quote_category_switch — priced server-side and never trusted from the
-- browser. Returns one row; `eligible` false carries a machine-readable
-- `reason` the UI turns into a sentence.
-- ---------------------------------------------------------------------------
drop function if exists public.quote_category_switch(date, text, text, integer, integer);

create or replace function public.quote_category_switch(
  p_dob date,
  p_cid text,
  p_target_type text,
  p_single_fee_cents integer,
  p_family_fee_cents integer
)
returns table (
  -- Deliberately not named "found": an OUT parameter by that name would
  -- shadow PL/pgSQL's built-in FOUND and break the lookup below.
  member_found boolean,
  eligible boolean,
  reason text,
  member_id uuid,
  name text,
  member_no integer,
  member_year int,
  current_type text,
  expires_at timestamptz,
  days_left int,
  amount_due_cents integer
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_member public.members%rowtype;
  v_now timestamptz := now();
  v_days int;
  v_age int;
  v_current_rate integer;
  v_target_rate integer;
begin
  member_found := false;
  eligible := false;
  reason := null;
  amount_due_cents := 0;
  days_left := 0;

  if p_target_type not in ('single', 'family') then
    reason := 'bad_target';
    return next;
    return;
  end if;

  select *
  into v_member
  from public.members m
  where m.date_of_birth = p_dob
    and m.cid = trim(p_cid)
  order by coalesce(m.joined_at, m.created_at), m.created_at
  limit 1;

  if not found then
    reason := 'not_found';
    return next;
    return;
  end if;

  member_found := true;
  member_id := v_member.id;
  name := v_member.name;
  member_no := v_member.member_no;
  member_year := extract(year from coalesce(v_member.joined_at, v_member.created_at))::int;
  current_type := v_member.membership_type;
  expires_at := v_member.expires_at;

  -- A dependent child is recorded under whoever registered them; they are not
  -- the person who gets to move a household between categories.
  if v_member.is_dependent then
    reason := 'dependent';
    return next;
    return;
  end if;

  if v_member.status <> 'active' then
    reason := 'not_active';
    return next;
    return;
  end if;

  -- No unused days means nothing to prorate — they should simply register at
  -- the full annual fee instead.
  if v_member.expires_at is null or v_member.expires_at <= v_now then
    reason := 'expired';
    return next;
    return;
  end if;

  if v_member.membership_type = p_target_type then
    reason := 'same_type';
    return next;
    return;
  end if;

  -- Covered for the remainder of the current day, hence ceil. Capped so a
  -- corrupted far-future expiry can never produce an absurd credit.
  v_days := least(
    366,
    ceil(extract(epoch from (v_member.expires_at - v_now)) / 86400.0)::int
  );
  v_age := extract(year from age(v_member.date_of_birth))::int;

  -- What they would pay today under their current category. An under-18 Single
  -- member pays nothing, so they have no credit to carry into Family.
  v_current_rate := case
    when v_member.membership_type = 'family' then p_family_fee_cents
    when v_age < 18 then 0
    else p_single_fee_cents
  end;
  v_target_rate := case
    when p_target_type = 'family' then p_family_fee_cents
    when v_age < 18 then 0
    else p_single_fee_cents
  end;

  eligible := true;
  days_left := v_days;
  amount_due_cents := greatest(
    0,
    round((v_target_rate - v_current_rate)::numeric * v_days / 365.0)::integer
  );
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- apply_category_switch — the single place the switch actually lands, shared
-- by the $0 path (applied inline) and the paid path (applied by the webhook).
-- Everyone in the household is moved onto the anchor member's existing expiry,
-- which is what keeps a household on one date.
-- ---------------------------------------------------------------------------
create or replace function public.apply_category_switch(
  p_household_id uuid,
  p_target_type text,
  p_anchor_expires_at timestamptz
)
returns setof public.members
language sql
security definer
set search_path = public
as $$
  update public.members m
  set membership_type = p_target_type,
      -- Leaving a household: the grouping is meaningless for a Single member
      -- and a stale id would misreport them in the Register of Members.
      household_id = case when p_target_type = 'single' then null else m.household_id end,
      is_dependent = case when p_target_type = 'single' then false else m.is_dependent end,
      status = 'active',
      joined_at = coalesce(m.joined_at, now()),
      expires_at = p_anchor_expires_at,
      updated_at = now()
  where m.household_id = p_household_id
  returning *;
$$;

-- ---------------------------------------------------------------------------
-- submit_category_switch — records everyone in the resulting household and
-- either applies the switch immediately (nothing to pay) or parks it on a
-- pending checkout for the webhook. Deliberately does NOT touch
-- membership_type before payment.
-- ---------------------------------------------------------------------------
drop function if exists public.submit_category_switch(uuid, text, integer, text, jsonb);

create or replace function public.submit_category_switch(
  p_household_id uuid,
  p_session_id text,
  p_fee_cents integer,
  p_target_type text,
  p_members jsonb
)
returns table (
  applied boolean,
  member_id uuid,
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
  v_anchor public.members%rowtype;
  v_first boolean := true;
  v_applied boolean := false;
begin
  if p_target_type not in ('single', 'family') then
    raise exception 'Unknown membership type %', p_target_type;
  end if;

  for v_item in
    select * from jsonb_to_recordset(p_members)
      as x(member_id uuid, email text, name text, gender text, dob date, cid text, phone text, suburb text)
  loop
    select *
    into v_member
    from public.members m
    where m.date_of_birth = v_item.dob
      and m.cid = trim(v_item.cid)
    order by coalesce(m.joined_at, m.created_at), m.created_at
    limit 1;

    if found then
      update public.members
      set email = trim(v_item.email),
          name = trim(v_item.name),
          gender = nullif(trim(coalesce(v_item.gender, '')), ''),
          phone = nullif(trim(coalesce(v_item.phone, '')), ''),
          suburb = nullif(trim(coalesce(v_item.suburb, '')), ''),
          household_id = p_household_id,
          is_dependent = (extract(year from age(v_item.dob)) < 18),
          updated_at = v_now
      where id = v_member.id
      returning * into v_member;
    else
      insert into public.members (
        id, email, name, gender, date_of_birth, cid, phone, suburb,
        fee_cents, status, household_id, is_dependent
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
        (extract(year from age(v_item.dob)) < 18)
      )
      returning * into v_member;
    end if;

    -- The first person listed is the existing member whose unused days were
    -- priced, and whose renewal date the whole household inherits.
    if v_first then
      v_anchor := v_member;
      v_first := false;
    end if;
  end loop;

  if v_anchor.id is null then
    raise exception 'A category switch needs at least one member';
  end if;
  if v_anchor.expires_at is null then
    raise exception 'The switching member has no active membership to move';
  end if;

  if p_fee_cents = 0 then
    perform public.apply_category_switch(p_household_id, p_target_type, v_anchor.expires_at);
    v_applied := true;
  else
    if p_session_id is null or trim(p_session_id) = '' then
      raise exception 'Stripe Checkout Session id is required for a paid category switch';
    end if;

    insert into public.member_checkouts (
      stripe_checkout_session_id, member_id, household_id, kind, fee_cents, status,
      switch_to_type, anchor_expires_at
    )
    values (
      p_session_id,
      v_anchor.id,
      p_household_id,
      'switch',
      p_fee_cents,
      'pending',
      p_target_type,
      v_anchor.expires_at
    );
  end if;

  for v_member in
    select * from public.members m where m.household_id = p_household_id
      or (p_target_type = 'single' and m.id = v_anchor.id)
    order by is_dependent, created_at
  loop
    applied := v_applied;
    member_id := v_member.id;
    name := v_member.name;
    member_no := v_member.member_no;
    member_year := extract(year from coalesce(v_member.joined_at, v_member.created_at))::int;
    expires_at := v_member.expires_at;
    return next;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- activate_membership_checkout — extended with a third branch for switches.
-- New and renewal checkouts behave exactly as they did in 0009.
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

  -- A switch keeps the member's existing renewal date (model A) rather than
  -- adding a year, so it never goes through the extend-by-one-year branches.
  if v_checkout.switch_to_type is not null then
    for v_member in
      select * from public.apply_category_switch(
        v_checkout.household_id,
        v_checkout.switch_to_type,
        v_checkout.anchor_expires_at
      )
    loop
      did_activate := true;
      notification_kind := 'switch';
      membership_type := v_member.membership_type;
      is_dependent := v_member.is_dependent;
      household_id := v_member.household_id;
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
-- Family -> Single via the ordinary Join form: the renewal branch of
-- submit_membership_registration never reset the family fields, so a member
-- who moved back to Single kept membership_type = 'family' and their old
-- household_id. That mislabelled them in the Register of Members, made the
-- confirmation email quote the $30 family fee, and — for a dependent who had
-- since turned 18 — suppressed their email entirely, because the webhook only
-- emails rows with is_dependent = false. Same signature as 0007; only the
-- renewal UPDATE changed.
-- ---------------------------------------------------------------------------
create or replace function public.submit_membership_registration(
  p_member_id uuid,
  p_email text,
  p_name text,
  p_gender text,
  p_dob date,
  p_cid text,
  p_phone text,
  p_suburb text,
  p_fee_cents integer,
  p_session_id text default null
)
returns table (
  member_id uuid,
  is_renewal boolean,
  status text,
  member_no integer,
  member_year int,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members%rowtype;
  v_now timestamptz := now();
  v_is_renewal boolean := false;
begin
  select *
  into v_member
  from public.members m
  where m.date_of_birth = p_dob
    and m.cid = trim(p_cid)
  order by coalesce(m.joined_at, m.created_at), m.created_at
  limit 1;

  if found then
    v_is_renewal := true;

    update public.members
    set email = trim(p_email),
        name = trim(p_name),
        gender = nullif(trim(coalesce(p_gender, '')), ''),
        phone = nullif(trim(coalesce(p_phone, '')), ''),
        suburb = nullif(trim(coalesce(p_suburb, '')), ''),
        fee_cents = p_fee_cents,
        membership_type = 'single',
        household_id = null,
        is_dependent = false,
        updated_at = v_now
    where id = v_member.id
    returning * into v_member;
  else
    insert into public.members (
      id, email, name, gender, date_of_birth, cid, phone, suburb,
      fee_cents, status, joined_at, expires_at
    )
    values (
      p_member_id,
      trim(p_email),
      trim(p_name),
      nullif(trim(coalesce(p_gender, '')), ''),
      p_dob,
      trim(p_cid),
      nullif(trim(coalesce(p_phone, '')), ''),
      nullif(trim(coalesce(p_suburb, '')), ''),
      p_fee_cents,
      case when p_fee_cents = 0 then 'active' else 'pending' end,
      case when p_fee_cents = 0 then v_now else null end,
      case when p_fee_cents = 0 then v_now + interval '1 year' else null end
    )
    returning * into v_member;
  end if;

  if p_fee_cents = 0 then
    -- Aliased on purpose. Unqualified `joined_at` / `expires_at` here are
    -- ambiguous against this function's OUT parameters of the same name, and
    -- PL/pgSQL's default variable_conflict = error made the free under-18
    -- registration path fail outright ("column reference expires_at is
    -- ambiguous"). That bug shipped in 0007 and is fixed here.
    update public.members m
    set status = 'active',
        joined_at = coalesce(m.joined_at, v_now),
        expires_at = greatest(coalesce(m.expires_at, v_now), v_now) + interval '1 year',
        updated_at = v_now
    where m.id = v_member.id
    returning * into v_member;
  else
    if p_session_id is null or trim(p_session_id) = '' then
      raise exception 'Stripe Checkout Session id is required for paid memberships';
    end if;

    insert into public.member_checkouts (
      stripe_checkout_session_id, member_id, kind, fee_cents, status
    )
    values (
      p_session_id,
      v_member.id,
      case when v_is_renewal then 'renewal' else 'new' end,
      p_fee_cents,
      'pending'
    );
  end if;

  member_id := v_member.id;
  is_renewal := v_is_renewal;
  status := v_member.status;
  member_no := v_member.member_no;
  member_year := extract(year from coalesce(v_member.joined_at, v_member.created_at))::int;
  expires_at := v_member.expires_at;
  return next;
end;
$$;
