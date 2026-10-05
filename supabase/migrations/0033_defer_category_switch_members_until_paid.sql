-- ABAC website — don't create (or move) a category switch's household
-- members until the switch's payment is confirmed.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0032 to have been run first. It is purely ADDITIVE, so it is
-- safe to run BEFORE the matching code is deployed (and in a quiet moment):
-- the old submit_category_switch is left in place and still handles every
-- switch that needs no payment.
--
-- Problem: for a PAID switch (Single -> Family), submit_category_switch
-- wrote to `members` before the person had paid. member_no is an identity
-- column (0004), so an abandoned checkout permanently used up a number for
-- every newly listed adult or child, left their pending rows behind, and
-- moved the existing member into the new household. Only the type change
-- itself waited for payment.
--
-- Fix: same approach as 0032. A paid switch only records WHAT was submitted
-- (as a payload on the pending checkout, with the switching member's current
-- renewal date as the anchor). activate_membership_checkout creates/updates
-- the household and then applies the switch, in one transaction, once Stripe
-- confirms payment. A switch that costs nothing keeps using
-- submit_category_switch, since there is no payment to wait for.
--
-- Compatibility: checkouts with no payload (a switch started before this
-- code) still activate exactly as before — see the S9-style test in the
-- commit that adds this file.
--
-- Same trap notes as 0032: every table is aliased and no OUT parameter is
-- named after a column.

-- ---------------------------------------------------------------------------
-- 1. Record a paid switch WITHOUT touching any member.
-- ---------------------------------------------------------------------------
create or replace function public.register_category_switch_checkout(
  p_household_id uuid,
  p_session_id text,
  p_fee_cents integer,
  p_target_type text,
  p_members jsonb
)
returns table (anchor_member_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anchor public.members%rowtype;
begin
  if p_target_type not in ('single', 'family') then
    raise exception 'Unknown membership type %', p_target_type;
  end if;
  if p_session_id is null or trim(p_session_id) = '' then
    raise exception 'Stripe Checkout Session id is required for a paid category switch';
  end if;
  if p_fee_cents is null or p_fee_cents <= 0 then
    raise exception 'A paid category switch needs a fee above zero';
  end if;
  if p_household_id is null then
    raise exception 'A category switch needs a household id';
  end if;
  if p_members is null
     or jsonb_typeof(p_members) <> 'array'
     or jsonb_array_length(p_members) = 0 then
    raise exception 'A category switch needs at least one member';
  end if;

  -- The first person listed is the existing member whose unused days were
  -- priced, and whose renewal date the whole household inherits. Looked up
  -- the same way the registration functions find an existing member.
  select *
  into v_anchor
  from public.members m
  where m.date_of_birth = (p_members -> 0 ->> 'dob')::date
    and m.cid = trim(p_members -> 0 ->> 'cid')
  order by coalesce(m.joined_at, m.created_at), m.created_at
  limit 1;

  if not found or v_anchor.expires_at is null then
    raise exception 'The switching member has no active membership to move';
  end if;

  insert into public.member_checkouts (
    stripe_checkout_session_id, member_id, household_id, kind, fee_cents, status,
    switch_to_type, anchor_expires_at, registration
  )
  values (
    p_session_id,
    v_anchor.id,
    p_household_id,
    'switch',
    p_fee_cents,
    'pending',
    p_target_type,
    v_anchor.expires_at,
    p_members
  );

  anchor_member_id := v_anchor.id;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Activation — 0032's, with the "create the people from the payload"
--    block moved ABOVE the switch branch so a switch checkout that carries a
--    payload gets its household built first, then the switch applied to it.
--    Nothing else in the function changes.
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

  -- The payment is confirmed, so this is the first moment the people on the
  -- registration are written to `members` (and, for anyone new, the moment
  -- member_no is assigned). Same find-or-create rules the old registration
  -- functions applied up front. It now runs BEFORE the switch branch below
  -- as well, so a paid category switch creates/moves its household members
  -- here too; the switch then applies its type change and (inherited)
  -- renewal date to them as it always did.
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

notify pgrst, 'reload schema';
