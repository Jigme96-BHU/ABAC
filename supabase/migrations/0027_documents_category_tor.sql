-- ABAC website — fix documents.category to accept 'tor'.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0010_documents.sql to have been run first.
--
-- lib/document-categories.ts (the admin form's category dropdown) has
-- offered "TOR for leadership roles" since it was added, but
-- 0010_documents.sql's check constraint never included 'tor' — selecting
-- that category and submitting fails with a database constraint violation.
-- documents_category_check is Postgres's default auto-generated name for an
-- inline column check (table_column_check), the same naming convention
-- already relied on in 0018_category_switch.sql for member_checkouts_kind_check.

alter table public.documents drop constraint if exists documents_category_check;
alter table public.documents add constraint documents_category_check
  check (category in ('constitution', 'policy', 'tor', 'financial', 'minutes', 'other'));
