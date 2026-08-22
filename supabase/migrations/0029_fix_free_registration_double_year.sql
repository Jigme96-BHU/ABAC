-- ABAC website — fix free (under-18) registrations getting 2 years of
-- validity instead of 1.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0018_category_switch.sql to have been run first (this
-- redefines the same function, same signature, and is otherwise identical).
--
-- Bug: for a brand-new free registration, the INSERT already sets
-- expires_at = now() + 1 year. The block right after it — meant to roll a
-- RENEWAL's expiry forward from whichever is later, the existing expiry or
-- now — ran unconditionally for both branches, so a first-time registration
-- got a second `+ interval '1 year'` on top of what the INSERT just set:
-- every child's free membership was silently granted 2 years instead of 1.
-- A genuine renewal (the `found` branch) was unaffected — its UPDATE never
-- touches expires_at before this block runs, so the roll-forward logic
-- there was already correct. Confirmed by running this function against a
-- local Postgres before and after this change.

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
    -- Aliased on purpose — see 0018's note on ambiguous OUT-parameter names.
    -- Only a renewal (v_is_renewal) rolls the expiry forward here; a
    -- brand-new registration already got its one year from the INSERT
    -- above, so it passes through untouched instead of gaining a second.
    update public.members m
    set status = 'active',
        joined_at = coalesce(m.joined_at, v_now),
        expires_at = case
          when v_is_renewal then greatest(coalesce(m.expires_at, v_now), v_now) + interval '1 year'
          else m.expires_at
        end,
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
