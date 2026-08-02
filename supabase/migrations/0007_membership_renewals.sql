-- ABAC website — permanent membership numbers + renewal checkouts.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0003_members.sql through 0006_member_notification.sql.
--
-- The important behaviour change:
--   * A member's first membership number stays with them permanently.
--   * A later registration with the same DOB + CID renews that member
--     instead of creating another membership number.
--   * Stripe Checkout Sessions are tracked separately from the member row, so
--     pending renewals do not temporarily overwrite the member's active status.

create table if not exists public.member_checkouts (
  stripe_checkout_session_id text primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  kind text not null check (kind in ('new', 'renewal')),
  fee_cents integer not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists member_checkouts_member_idx
  on public.member_checkouts (member_id);

alter table public.member_checkouts enable row level security;

drop policy if exists "Admins can view member checkouts" on public.member_checkouts;
create policy "Admins can view member checkouts"
  on public.member_checkouts for select
  using (public.is_admin());

drop function if exists public.submit_membership_registration(
  uuid,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  integer,
  text
);

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
        updated_at = v_now
    where id = v_member.id
    returning * into v_member;
  else
    insert into public.members (
      id,
      email,
      name,
      gender,
      date_of_birth,
      cid,
      phone,
      suburb,
      fee_cents,
      status,
      joined_at,
      expires_at
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
    update public.members
    set status = 'active',
        joined_at = coalesce(joined_at, v_now),
        expires_at = greatest(coalesce(expires_at, v_now), v_now) + interval '1 year',
        updated_at = v_now
    where id = v_member.id
    returning * into v_member;
  else
    if p_session_id is null or trim(p_session_id) = '' then
      raise exception 'Stripe Checkout Session id is required for paid memberships';
    end if;

    insert into public.member_checkouts (
      stripe_checkout_session_id,
      member_id,
      kind,
      fee_cents,
      status
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

drop function if exists public.activate_membership_checkout(text);

create or replace function public.activate_membership_checkout(p_session_id text)
returns table (
  did_activate boolean,
  notification_kind text,
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

  update public.members m
  set status = 'active',
      joined_at = coalesce(m.joined_at, v_now),
      expires_at = greatest(coalesce(m.expires_at, v_now), v_now) + interval '1 year',
      updated_at = v_now
  where m.id = v_checkout.member_id
  returning * into v_member;

  did_activate := true;
  notification_kind := v_checkout.kind;
  email := v_member.email;
  name := v_member.name;
  member_no := v_member.member_no;
  member_year := extract(year from coalesce(v_member.joined_at, v_member.created_at))::int;
  fee_cents := v_checkout.fee_cents;
  expires_at := v_member.expires_at;
  return next;
end;
$$;

drop function if exists public.get_membership_confirmation(text, uuid);

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
    case when c.status = 'paid' then 'active' else 'pending' end,
    m.member_no,
    extract(year from coalesce(m.joined_at, m.created_at))::int
  from public.member_checkouts c
  join public.members m on m.id = c.member_id
  where p_session_id is not null
    and c.stripe_checkout_session_id = p_session_id

  union all

  -- Backward compatibility for registrations created before this migration,
  -- when the Stripe Checkout Session id lived directly on members.
  select
    m.status,
    m.member_no,
    extract(year from coalesce(m.joined_at, m.created_at))::int
  from public.members m
  where p_session_id is not null
    and m.stripe_checkout_session_id = p_session_id

  union all

  select
    m.status,
    m.member_no,
    extract(year from coalesce(m.joined_at, m.created_at))::int
  from public.members m
  where p_member_id is not null
    and m.id = p_member_id
  limit 1;
$$;

drop function if exists public.get_member_for_notification(text);

create or replace function public.get_member_for_notification(p_session_id text)
returns table (
  email text,
  name text,
  member_no integer,
  member_year int,
  fee_cents integer,
  expires_at timestamptz,
  notification_kind text
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
    c.fee_cents,
    m.expires_at,
    c.kind
  from public.member_checkouts c
  join public.members m on m.id = c.member_id
  where c.stripe_checkout_session_id = p_session_id
    and c.status = 'paid'

  union all

  -- Backward compatibility for paid registrations completed before renewals
  -- were split into member_checkouts.
  select
    m.email,
    m.name,
    m.member_no,
    extract(year from coalesce(m.joined_at, m.created_at))::int,
    m.fee_cents,
    m.expires_at,
    'new'
  from public.members m
  where m.stripe_checkout_session_id = p_session_id
  limit 1;
$$;

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
  order by coalesce(m.joined_at, m.created_at), m.created_at
  limit 1;
$$;
