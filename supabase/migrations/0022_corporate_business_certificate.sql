-- ABAC website — Business Certificate uploads for Corporate Membership
-- applications, plus an admin "hide from Our Partners" toggle.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0012_corporate_membership.sql to have been run first.

alter table public.corporate_members
  add column if not exists business_certificate_path text,
  add column if not exists hidden_from_partners boolean not null default false;

-- get_active_corporate_partners (0012) is redefined to also respect the new
-- hide toggle — a display-only flag that never touches `status`, so it can't
-- interfere with the approve/reject/webhook state machine.
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
  where m.status = 'active' and not m.hidden_from_partners
  order by case m.tier when 'diamond' then 1 when 'platinum' then 2 else 3 end, m.business_name;
$$;

-- ---------------------------------------------------------------------------
-- storage — a PRIVATE bucket for business certificates, same shape as
-- service-documents (0013): anyone can upload (that's the application
-- itself), only admins can read/replace/delete, viewed via a short-lived
-- signed URL rather than a public path. A registration certificate is more
-- sensitive than a logo (it can carry a business registration number), so
-- it doesn't belong in the public corporate-logos bucket.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('corporate-documents', 'corporate-documents', false, 5242880)
on conflict (id) do nothing;

drop policy if exists "Public can upload corporate documents" on storage.objects;
create policy "Public can upload corporate documents"
  on storage.objects for insert
  with check (bucket_id = 'corporate-documents');

drop policy if exists "Admins can view corporate documents" on storage.objects;
create policy "Admins can view corporate documents"
  on storage.objects for select
  using (bucket_id = 'corporate-documents' and public.is_admin());

drop policy if exists "Admins can update corporate documents" on storage.objects;
create policy "Admins can update corporate documents"
  on storage.objects for update
  using (bucket_id = 'corporate-documents' and public.is_admin());

drop policy if exists "Admins can delete corporate documents" on storage.objects;
create policy "Admins can delete corporate documents"
  on storage.objects for delete
  using (bucket_id = 'corporate-documents' and public.is_admin());
