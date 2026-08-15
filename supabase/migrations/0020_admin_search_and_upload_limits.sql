-- ABAC website — search indexes for the new admin Members/Corporate tabs,
-- plus a real (server-enforced) 3MB size cap on service documents.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0003_members.sql, 0012_corporate_membership.sql, and
-- 0013_service_requests.sql to have been run first.

-- Case-insensitive search on members — name/email/CID lookup in the new
-- admin Members tab (app/admin/actions.ts's searchMembers).
create index if not exists members_email_lower_idx on public.members (lower(email));
create index if not exists members_name_lower_idx on public.members (lower(name));

-- Same for corporate members (business name/contact name/email lookup).
create index if not exists corporate_members_business_name_lower_idx on public.corporate_members (lower(business_name));
create index if not exists corporate_members_contact_name_lower_idx on public.corporate_members (lower(contact_name));
create index if not exists corporate_members_email_lower_idx on public.corporate_members (lower(email));

-- Backs the Members tab's "services availed" panel — service_requests has
-- no member_id FK (only a free-text email), so this is a deliberate email
-- join, not a referential-integrity one. See getMemberDetail's doc comment
-- in app/admin/actions.ts for why that's an acceptable trade-off here.
create index if not exists service_requests_email_lower_idx on public.service_requests (lower(email));

-- Real 3MB cap on service-documents, enforced by Storage itself — a
-- backstop behind the client-side check in the direct-to-storage upload
-- flow (app/services/actions.ts), not just something the browser promises
-- to respect.
update storage.buckets set file_size_limit = 3145728 where id = 'service-documents';
