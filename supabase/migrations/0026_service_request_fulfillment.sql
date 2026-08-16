-- ABAC website — lets an admin send the finished document (Letter of
-- Residency / Character Reference) back to the requester by email, once
-- the committee has actually written it up.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0013_service_requests.sql to have been run first.
--
-- No Storage policy change needed: service-documents' insert policy
-- (0013) is already public (`with check (bucket_id = 'service-documents')`,
-- no admin gate), so the admin's own upload of the rendered document goes
-- through the same policy every requester's own document upload already
-- uses.

alter table public.service_requests
  add column if not exists rendered_document_path text,
  add column if not exists fulfilled_at timestamptz;

create index if not exists service_requests_requester_name_lower_idx on public.service_requests (lower(requester_name));
