-- ABAC website — Corporate Membership (Diamond / Platinum / Gold).
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0001_events_admin.sql to have been run first (reuses its
-- public.is_admin() function and public.set_updated_at() trigger function).
-- Independent of the membership/documents/volunteers migrations (0003–0011).
--
-- Unlike Single/Family membership, Corporate applications are not self-serve:
-- an application is 'pending' until an admin approves it (which emails the
-- applicant a Stripe payment link), and only becomes 'active' once Stripe
-- confirms payment via the webhook — the same "never claim active before
-- payment really clears" rule already documented in lib/emails/welcome.ts.

-- ---------------------------------------------------------------------------
-- corporate_members — holds business PII (ABN, contact details). Same
-- security model as members/volunteers: no public SELECT — only admins can
-- read this table, via the RLS policy below. The public Our Partners page
-- reads through get_active_corporate_partners() instead, which exposes only
-- the fields that are actually meant to be public.
-- ---------------------------------------------------------------------------
create table if not exists public.corporate_members (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  abn text,
  website text,
  contact_name text not null,
  contact_role text,
  email text not null,
  phone text not null,
  address text,
  notes text,
  tier text not null check (tier in ('diamond', 'platinum', 'gold')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'active', 'rejected')),
  stripe_checkout_session_id text,
  fee_cents integer,
  logo_path text,
  joined_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists corporate_members_status_idx on public.corporate_members (status);
create index if not exists corporate_members_stripe_session_idx on public.corporate_members (stripe_checkout_session_id);

drop trigger if exists corporate_members_set_updated_at on public.corporate_members;
create trigger corporate_members_set_updated_at
  before update on public.corporate_members
  for each row
  execute function public.set_updated_at();

alter table public.corporate_members enable row level security;

-- Anyone can submit a corporate application — that's the entry point, no
-- account to be signed into. Can only ever insert as 'pending': flipping it
-- to approved/active/rejected requires an admin or the SECURITY DEFINER
-- functions below, never the client directly — same anti-tamper shape as
-- members' insert policy.
drop policy if exists "Public can apply for corporate membership" on public.corporate_members;
create policy "Public can apply for corporate membership"
  on public.corporate_members for insert
  with check (status = 'pending');

drop policy if exists "Admins can view corporate members" on public.corporate_members;
create policy "Admins can view corporate members"
  on public.corporate_members for select
  using (public.is_admin());

drop policy if exists "Admins can update corporate members" on public.corporate_members;
create policy "Admins can update corporate members"
  on public.corporate_members for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete corporate members" on public.corporate_members;
create policy "Admins can delete corporate members"
  on public.corporate_members for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- get_active_corporate_partners — lets the public "Our Partners" page list
-- approved, paid corporate members without any public SELECT on the table
-- itself (which holds ABN, email, phone, notes). Returns only what's meant
-- to be public.
-- ---------------------------------------------------------------------------
drop function if exists public.get_active_corporate_partners();

create or replace function public.get_active_corporate_partners()
returns table (
  business_name text,
  tier text,
  logo_path text,
  website text
)
language sql
security definer
set search_path = public
stable
as $$
  select m.business_name, m.tier, m.logo_path, m.website
  from public.corporate_members m
  where m.status = 'active'
  order by case m.tier when 'diamond' then 1 when 'platinum' then 2 else 3 end, m.business_name;
$$;

-- ---------------------------------------------------------------------------
-- activate_corporate_membership — called by the Stripe webhook after a
-- corporate application's payment succeeds. Only touches a row that is
-- currently 'approved' and matches the given Checkout Session id, so a
-- retried webhook delivery is a harmless no-op the second time.
-- ---------------------------------------------------------------------------
drop function if exists public.activate_corporate_membership(text);

create or replace function public.activate_corporate_membership(p_session_id text)
returns table (
  did_activate boolean,
  business_name text,
  contact_name text,
  email text,
  tier text,
  fee_cents integer,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.corporate_members%rowtype;
  v_now timestamptz := now();
begin
  update public.corporate_members m
  set status = 'active',
      joined_at = coalesce(m.joined_at, v_now),
      expires_at = greatest(coalesce(m.expires_at, v_now), v_now) + interval '1 year',
      updated_at = v_now
  where m.stripe_checkout_session_id = p_session_id
    and m.status = 'approved'
  returning * into v_member;

  if not found then
    did_activate := false;
    return next;
    return;
  end if;

  did_activate := true;
  business_name := v_member.business_name;
  contact_name := v_member.contact_name;
  email := v_member.email;
  tier := v_member.tier;
  fee_cents := v_member.fee_cents;
  expires_at := v_member.expires_at;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- storage — a public bucket for corporate partner logos. Public read
-- (anyone can view a logo, same as any other image on the site); writes
-- restricted to admins, since logo upload/removal is an admin-only action.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('corporate-logos', 'corporate-logos', true)
on conflict (id) do nothing;

drop policy if exists "Public can view corporate logos" on storage.objects;
create policy "Public can view corporate logos"
  on storage.objects for select
  using (bucket_id = 'corporate-logos');

drop policy if exists "Admins can upload corporate logos" on storage.objects;
create policy "Admins can upload corporate logos"
  on storage.objects for insert
  with check (bucket_id = 'corporate-logos' and public.is_admin());

drop policy if exists "Admins can update corporate logos" on storage.objects;
create policy "Admins can update corporate logos"
  on storage.objects for update
  using (bucket_id = 'corporate-logos' and public.is_admin());

drop policy if exists "Admins can delete corporate logos" on storage.objects;
create policy "Admins can delete corporate logos"
  on storage.objects for delete
  using (bucket_id = 'corporate-logos' and public.is_admin());
