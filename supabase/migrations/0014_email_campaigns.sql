-- Email campaigns table for tracking bulk announcements sent by admins
create table public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  message text not null,
  recipient_filter jsonb not null, -- {membershipTypes: ['single', 'family'], corporateTiers: ['gold', 'platinum', 'diamond'], dateRange: {start, end}, includeInactive: bool, individualMemberIds: []}
  attachment_paths text[] default array[]::text[], -- paths to uploaded attachments in storage
  recipient_count integer not null default 0,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.email_campaigns enable row level security;

-- Admin-only access
create policy "Admins can view campaigns"
  on public.email_campaigns for select
  using (public.is_admin());

create policy "Admins can create campaigns"
  on public.email_campaigns for insert
  with check (public.is_admin() and admin_id = auth.uid());

create policy "Admins can update campaigns"
  on public.email_campaigns for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete campaigns"
  on public.email_campaigns for delete
  using (public.is_admin());

-- Storage bucket for email attachments (private)
insert into storage.buckets (id, name, public)
values ('email-attachments', 'email-attachments', false)
on conflict (id) do nothing;

-- Storage policies for email attachments
create policy "Public can upload email attachments"
  on storage.objects for insert
  with check (bucket_id = 'email-attachments');

create policy "Admins can view email attachments"
  on storage.objects for select
  using (bucket_id = 'email-attachments' and public.is_admin());

create policy "Admins can delete email attachments"
  on storage.objects for delete
  using (bucket_id = 'email-attachments' and public.is_admin());
