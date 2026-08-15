-- ABAC website — automatic membership expiry reminder emails.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0007_membership_renewals.sql.
--
-- The website calls get_members_due_for_expiry_reminders() from a protected
-- cron route once per day. The route sends email, then marks that reminder as
-- sent so each member receives each reminder only once per membership period.

alter table public.members
  add column if not exists expiry_reminder_14d_sent_at timestamptz,
  add column if not exists expiry_reminder_expired_sent_at timestamptz;

drop function if exists public.get_members_due_for_expiry_reminders(date);

create or replace function public.get_members_due_for_expiry_reminders(p_today date default current_date)
returns table (
  member_id uuid,
  email text,
  name text,
  member_no integer,
  member_year int,
  expires_at timestamptz,
  reminder_kind text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    m.id as member_id,
    m.email,
    m.name,
    m.member_no,
    extract(year from coalesce(m.joined_at, m.created_at))::int as member_year,
    m.expires_at,
    '14d' as reminder_kind
  from public.members m
  where m.status = 'active'
    and m.expires_at is not null
    and m.expires_at::date = p_today + 14
    and m.expiry_reminder_14d_sent_at is null

  union all

  select
    m.id as member_id,
    m.email,
    m.name,
    m.member_no,
    extract(year from coalesce(m.joined_at, m.created_at))::int as member_year,
    m.expires_at,
    'expired' as reminder_kind
  from public.members m
  where m.status = 'active'
    and m.expires_at is not null
    and m.expires_at::date <= p_today
    and m.expiry_reminder_expired_sent_at is null
  order by expires_at, member_id, reminder_kind;
$$;

drop function if exists public.mark_member_expiry_reminder_sent(uuid, text);

create or replace function public.mark_member_expiry_reminder_sent(
  p_member_id uuid,
  p_reminder_kind text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if p_reminder_kind = '14d' then
    update public.members
    set expiry_reminder_14d_sent_at = now()
    where id = p_member_id
      and expiry_reminder_14d_sent_at is null;
  elsif p_reminder_kind = 'expired' then
    update public.members
    set expiry_reminder_expired_sent_at = now(),
        status = 'expired'
    where id = p_member_id
      and expiry_reminder_expired_sent_at is null;
  else
    raise exception 'Unknown reminder kind: %', p_reminder_kind;
  end if;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

drop function if exists public.reset_member_expiry_reminders(uuid);

create or replace function public.reset_member_expiry_reminders(p_member_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  update public.members
  set expiry_reminder_14d_sent_at = null,
      expiry_reminder_expired_sent_at = null
  where id = p_member_id;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create or replace function public.reset_expiry_reminders_on_extension()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.expires_at is distinct from old.expires_at
     and new.expires_at is not null
     and (old.expires_at is null or new.expires_at > old.expires_at) then
    new.expiry_reminder_14d_sent_at := null;
    new.expiry_reminder_expired_sent_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists members_reset_expiry_reminders on public.members;
create trigger members_reset_expiry_reminders
  before update on public.members
  for each row
  execute function public.reset_expiry_reminders_on_extension();
