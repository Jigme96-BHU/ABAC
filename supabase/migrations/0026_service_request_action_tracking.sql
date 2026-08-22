-- ABAC website — lets an admin track what's actually been done about a
-- service request from the Services tab in /admin: Done / Pending /
-- Declined, plus a free-text comment.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0013_service_requests.sql to have been run first.
--
-- action_status is deliberately a separate column from `status` (0013):
-- `status` is payment state (pending/active — has the requester actually
-- paid), `action_status` is committee workflow state (has the committee
-- actually done the thing). A request can be paid and still pending
-- action, so the two must never be conflated into one column.

alter table public.service_requests
  add column if not exists action_status text not null default 'pending'
    check (action_status in ('pending', 'done', 'declined')),
  add column if not exists admin_comment text;

create index if not exists service_requests_action_status_idx on public.service_requests (action_status);
create index if not exists service_requests_requester_name_lower_idx on public.service_requests (lower(requester_name));
