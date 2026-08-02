-- ABAC website — paid Service Requests (Letter of Residency / Character
-- Reference).
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0001_events_admin.sql to have been run first (reuses its
-- public.is_admin() function and public.set_updated_at() trigger function).
-- Independent of every other migration this project has (0003–0012).
--
-- This is the most sensitive table in the app: requesters upload scans of
-- their passport and other ID documents. Unlike Single/Family/Corporate
-- membership (which are also public-insert/admin-read-only), the Storage
-- bucket here is NOT public — even a leaked file path can't be fetched
-- without a signed URL or an authenticated admin session.

-- ---------------------------------------------------------------------------
-- service_requests
-- ---------------------------------------------------------------------------
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  service_type text not null check (service_type in ('letter_of_residency', 'character_reference')),
  requester_name text not null,
  email text not null,
  phone text not null,
  passport_path text not null,
  visa_path text,
  license_path text,
  proof_of_residency_path text,
  notes text,
  fee_cents integer not null default 1000,
  status text not null default 'pending' check (status in ('pending', 'active')),
  stripe_checkout_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_requests_stripe_session_idx
  on public.service_requests (stripe_checkout_session_id);

drop trigger if exists service_requests_set_updated_at on public.service_requests;
create trigger service_requests_set_updated_at
  before update on public.service_requests
  for each row
  execute function public.set_updated_at();

alter table public.service_requests enable row level security;

-- Anyone can submit a service request — that's the entry point. Can only
-- ever insert as 'pending': flipping it to 'active' requires the
-- SECURITY DEFINER function below (called by the Stripe webhook once
-- payment actually clears) or an admin, never the client directly.
drop policy if exists "Public can submit a service request" on public.service_requests;
create policy "Public can submit a service request"
  on public.service_requests for insert
  with check (status = 'pending');

drop policy if exists "Admins can view service requests" on public.service_requests;
create policy "Admins can view service requests"
  on public.service_requests for select
  using (public.is_admin());

drop policy if exists "Admins can update service requests" on public.service_requests;
create policy "Admins can update service requests"
  on public.service_requests for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete service requests" on public.service_requests;
create policy "Admins can delete service requests"
  on public.service_requests for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- activate_service_request — called by the Stripe webhook after a service
-- request's payment succeeds. Only touches a row that is currently
-- 'pending' and matches the given Checkout Session id, so a retried
-- webhook delivery is a harmless no-op the second time.
-- ---------------------------------------------------------------------------
drop function if exists public.activate_service_request(text);

create or replace function public.activate_service_request(p_session_id text)
returns table (
  did_activate boolean,
  service_type text,
  requester_name text,
  email text,
  fee_cents integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.service_requests%rowtype;
begin
  update public.service_requests r
  set status = 'active',
      updated_at = now()
  where r.stripe_checkout_session_id = p_session_id
    and r.status = 'pending'
  returning * into v_request;

  if not found then
    did_activate := false;
    return next;
    return;
  end if;

  did_activate := true;
  service_type := v_request.service_type;
  requester_name := v_request.requester_name;
  email := v_request.email;
  fee_cents := v_request.fee_cents;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- storage — a PRIVATE bucket for uploaded ID documents. Unlike every other
-- bucket in this project, `public` is false: files are never served via a
-- plain public URL, only via short-lived signed URLs an admin generates
-- on demand (see app/admin/actions.ts's getServiceDocumentUrl). Anyone can
-- upload (that's the submission itself); only admins can read/replace/
-- delete.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('service-documents', 'service-documents', false)
on conflict (id) do nothing;

drop policy if exists "Public can upload service documents" on storage.objects;
create policy "Public can upload service documents"
  on storage.objects for insert
  with check (bucket_id = 'service-documents');

drop policy if exists "Admins can view service documents" on storage.objects;
create policy "Admins can view service documents"
  on storage.objects for select
  using (bucket_id = 'service-documents' and public.is_admin());

drop policy if exists "Admins can update service documents" on storage.objects;
create policy "Admins can update service documents"
  on storage.objects for update
  using (bucket_id = 'service-documents' and public.is_admin());

drop policy if exists "Admins can delete service documents" on storage.objects;
create policy "Admins can delete service documents"
  on storage.objects for delete
  using (bucket_id = 'service-documents' and public.is_admin());
