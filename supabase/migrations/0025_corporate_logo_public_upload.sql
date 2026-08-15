-- ABAC website — let corporate applicants upload their logo at registration
-- time, instead of only after the committee approves them.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0012_corporate_membership.sql to have been run first.
--
-- corporate-logos' insert policy was admin-only (`public.is_admin()`),
-- because the only upload path used to be the admin dashboard, after
-- approval. Applicants now attach a logo on the public form itself
-- (components/CorporateForm.tsx), so insert has to be public — same
-- public-insert/admin-manages shape as every other Storage bucket in this
-- project (documents, service-documents, corporate-documents). Select stays
-- public (logos are meant to be seen), update/delete stay admin-only, so an
-- applicant can add a logo but never overwrite or remove one after the fact.

drop policy if exists "Admins can upload corporate logos" on storage.objects;
drop policy if exists "Public can upload corporate logos" on storage.objects;
create policy "Public can upload corporate logos"
  on storage.objects for insert
  with check (bucket_id = 'corporate-logos');
