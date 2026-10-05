-- ABAC website — don't create a member (or hand out a membership number)
-- until the payment is confirmed.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0031 to have been run first. It is purely ADDITIVE, so it is
-- safe to run BEFORE the matching code is deployed (and in a quiet moment):
-- nothing the live site calls today is removed or changes behaviour.
--
-- Problem: submit_membership_registration / submit_family_registration wrote
-- the member row before the person had paid. member_no is an identity column
-- (0004), so every abandoned or failed checkout permanently used up a
-- membership number — leaving gaps — and left a "pending" row behind. The
-- same functions also rewrote an EXISTING member's name/email/phone/household
-- on any submission carrying their date of birth + CID, before any payment
-- or verification.
--
-- Fix: a paid registration now only records WHAT was submitted (as a payload
-- on the pending checkout). Nothing touches `members` until Stripe confirms
-- payment; activate_membership_checkout then creates/updates the members and
-- activates them in one transaction, which is also the moment member_no is
-- assigned. Category switches already worked this way (0018).
--
-- Compatibility: the old functions are left in place, and
-- activate_membership_checkout below still handles checkouts that have no
-- payload (anything started before the code switch), exactly as before.
--
-- Two trap notes from this codebase's SQL history (see 0007 / 0029): OUT
-- parameter names shadow column names, so every table below is aliased and no
-- OUT parameter is named after a column.

-- ---------------------------------------------------------------------------
-- 1. Schema: a pending checkout can now exist without a member row yet.
-- ---------------------------------------------------------------------------
alter table public.member_checkouts
  alter column member_id drop not null;

alter table public.member_checkouts
  add column if not exists registration jsonb;

comment on column public.member_checkouts.registration is
  'The people to create/update on payment (same shape as submit_family_registration''s p_members). Null for checkouts started before 0032, which already have their member row(s).';

-- ---------------------------------------------------------------------------
-- 2. Record a paid registration WITHOUT creating any member.
-- ---------------------------------------------------------------------------
create or replace function public.register_membership_checkout(
  p_session_id text,
  p_fee_cents integer,
  p_household_id uuid,
  p_members jsonb
)
returns table (checkout_kind text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_history boolean;
begin
  if p_session_id is null or trim(p_session_id) = '' then
    raise exception 'Stripe Checkout Session id is required for a paid registration';
  end if;
  if p_fee_cents is null or p_fee_cents <= 0 then
    raise exception 'A paid registration needs a fee above zero';
  end if;
  if p_members is null
     or jsonb_typeof(p_members) <> 'array'
     or jsonb_array_length(p_members) = 0 then
    raise exception 'A registration needs at least one person';
  end if;
  if p_household_id is null and jsonb_array_length(p_members) <> 1 then
    raise exception 'A single registration is for exactly one person';
  end if;

  -- "Renewal" means someone here has actually been a member before — not
  -- merely that a row exists. A pending row left by an earlier failed
  -- attempt has never been active, so retrying it is still a first
  -- registration (and gets the welcome email, not the renewal one).
  select exists (
    select 1
    from jsonb_to_recordset(p_members) as x(dob date, cid text)
    join public.members m
      on m.date_of_birth = x.dob
     and m.cid = trim(x.cid)
    where m.joined_at is not null
       or m.status = 'active'
       or m.expires_at is not null
  )
  into v_has_history;

  insert into public.member_checkouts (
    stripe_checkout_session_id, member_id, household_id,
    kind, fee_cents, status, registration
  )
  values (
    p_session_id,
    null,
    p_household_id,
    case when v_has_history then 'renewal' else 'new' end,
    p_fee_cents,
    'pending',
    p_members
  );

  checkout_kind := case when v_has_history then 'renewal' else 'new' end;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Activation — identical to 0018's, plus one block that creates/updates the
--    people from the payload first when the checkout carries one.
-- ---------------------------------------------------------------------------
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
  v_item record;
  v_primary_id uuid;
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

  -- NEW: the payment is confirmed, so this is the first moment the people on
  -- the registration are written to `members` (and, for anyone new, the
  -- moment member_no is assigned). Same find-or-create rules the old
  -- registration functions applied up front; they then fall through to the
  -- unchanged activation below, which sets status and expiry.
  if v_checkout.registration is not null then
    for v_item in
      select * from jsonb_to_recordset(v_checkout.registration)
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
        if v_checkout.household_id is not null then
          update public.members
          set email = trim(v_item.email),
              name = trim(v_item.name),
              gender = nullif(trim(coalesce(v_item.gender, '')), ''),
              phone = nullif(trim(coalesce(v_item.phone, '')), ''),
              suburb = nullif(trim(coalesce(v_item.suburb, '')), ''),
              household_id = v_checkout.household_id,
              membership_type = 'family',
              is_dependent = (extract(year from age(v_item.dob)) < 18),
              updated_at = v_now
          where id = v_member.id
          returning * into v_member;
        else
          update public.members
          set email = trim(v_item.email),
              name = trim(v_item.name),
              gender = nullif(trim(coalesce(v_item.gender, '')), ''),
              phone = nullif(trim(coalesce(v_item.phone, '')), ''),
              suburb = nullif(trim(coalesce(v_item.suburb, '')), ''),
              fee_cents = v_checkout.fee_cents,
              membership_type = 'single',
              household_id = null,
              is_dependent = false,
              updated_at = v_now
          where id = v_member.id
          returning * into v_member;
        end if;
      else
        if v_checkout.household_id is not null then
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
            v_checkout.household_id,
            'family',
            (extract(year from age(v_item.dob)) < 18)
          )
          returning * into v_member;
        else
          insert into public.members (
            id, email, name, gender, date_of_birth, cid, phone, suburb,
            fee_cents, status
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
            v_checkout.fee_cents,
            'pending'
          )
          returning * into v_member;
        end if;
      end if;

      if v_primary_id is null then
        v_primary_id := v_member.id;
      end if;
    end loop;

    -- Never "activate" an empty registration: roll the whole transaction
    -- back (the checkout stays pending) and let Stripe's retry surface it.
    if v_primary_id is null then
      raise exception 'Checkout % carries a registration with no people', p_session_id;
    end if;

    -- The confirmation page finds a single registration through this link.
    update public.member_checkouts c
    set member_id = v_primary_id
    where c.stripe_checkout_session_id = p_session_id;
    v_checkout.member_id := v_primary_id;
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
-- 4. Make PostgREST pick up the new function straight away (Supabase usually
--    does this itself after DDL; this just removes any doubt).
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';
