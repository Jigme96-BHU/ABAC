-- ABAC website — members table + Stripe activation RPC + RLS.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0001_events_admin.sql to have been run first (reuses its
-- public.is_admin() function and public.set_updated_at() trigger function).

-- ---------------------------------------------------------------------------
-- members — holds real PII (date of birth, Citizenship ID, phone, suburb).
-- No SELECT policy for anon/authenticated: only admins can read this table,
-- and only through the RLS policy below, never a public API response.
-- ---------------------------------------------------------------------------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  gender text,
  date_of_birth date not null,
  cid text not null,
  phone text,
  suburb text,
  fee_cents integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired')),
  stripe_checkout_session_id text,
  joined_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_stripe_session_idx
  on public.members (stripe_checkout_session_id);

drop trigger if exists members_set_updated_at on public.members;
create trigger members_set_updated_at
  before update on public.members
  for each row
  execute function public.set_updated_at();

alter table public.members enable row level security;

-- Anyone can submit the join form (that's the entry point — there's no
-- account to be signed into yet). But a paid membership can only ever be
-- inserted as 'pending': flipping it to 'active' requires either an admin
-- or the activate_membership() function below, never the client directly —
-- so nobody can grant themselves a paid membership without actually paying.
drop policy if exists "Public can register as a member" on public.members;
create policy "Public can register as a member"
  on public.members for insert
  with check (status = 'pending' or (status = 'active' and fee_cents = 0));

drop policy if exists "Admins can view members" on public.members;
create policy "Admins can view members"
  on public.members for select
  using (public.is_admin());

drop policy if exists "Admins can update members" on public.members;
create policy "Admins can update members"
  on public.members for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete members" on public.members;
create policy "Admins can delete members"
  on public.members for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- activate_membership — called by the Stripe webhook (app/api/stripe/webhook)
-- after a successful payment. SECURITY DEFINER so the webhook can flip a
-- membership to active using the plain publishable-key client, with no
-- signed-in user and no service-role key needed anywhere.
--
-- Only touches a row that is currently 'pending' and matches the given
-- Checkout Session id, so a retried webhook delivery (Stripe does retry) is
-- a harmless no-op the second time rather than re-extending the expiry.
-- ---------------------------------------------------------------------------
create or replace function public.activate_membership(p_session_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  update public.members
  set status = 'active',
      joined_at = coalesce(joined_at, now()),
      expires_at = now() + interval '1 year'
  where stripe_checkout_session_id = p_session_id
    and status = 'pending';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_membership_status — lets /join/success check whether payment has been
-- confirmed yet, without granting any public read access to the members
-- table itself (which holds CID, date of birth, phone). Returns only the
-- status string for the given Checkout Session, nothing else about the row.
-- ---------------------------------------------------------------------------
create or replace function public.get_membership_status(p_session_id text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select status from public.members where stripe_checkout_session_id = p_session_id;
$$;
