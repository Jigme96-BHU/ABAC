-- ABAC website — restrict email-attachments uploads to admins.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0014_email_campaigns.sql to have been run first.
--
-- Unlike Documents/Corporate application/Service request uploads (all
-- genuine public-submission flows, hence public insert), a bulk email
-- attachment is only ever created by a signed-in admin composing a
-- campaign from the Email tab — there is no public form that uploads
-- here. 0014_email_campaigns.sql's original policy left insert public
-- (`with check (bucket_id = 'email-attachments')`, no admin gate), which
-- meant any anonymous visitor could upload arbitrary files to this bucket
-- even though they could never actually attach them to a real campaign
-- (sending requires admin auth). This closes that gap.

drop policy if exists "Public can upload email attachments" on storage.objects;
drop policy if exists "Admins can upload email attachments" on storage.objects;
create policy "Admins can upload email attachments"
  on storage.objects for insert
  with check (bucket_id = 'email-attachments' and public.is_admin());
