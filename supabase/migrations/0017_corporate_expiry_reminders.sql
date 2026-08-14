-- Add expiry reminder tracking to corporate members
-- Tracks which reminders have been sent (14 days before and on expiry date)

alter table public.corporate_members
  add column reminder_14d_sent boolean default false,
  add column reminder_expiry_sent boolean default false;

-- Index for efficient filtering in the cron job
create index if not exists idx_corporate_expiry_reminders
  on public.corporate_members(expires_at, reminder_14d_sent, reminder_expiry_sent)
  where status = 'active' and expires_at is not null;
