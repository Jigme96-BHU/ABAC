-- ABAC website — documents table + storage bucket for the "Policies &
-- Documents" library + RLS.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0001_events_admin.sql to have been run first (reuses its
-- public.is_admin() function and public.set_updated_at() trigger function).
-- Safe to re-run if something fails partway through.

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null check (category in ('constitution', 'policy', 'financial', 'minutes', 'other')),
  file_path text not null,
  file_name text not null,
  file_size integer,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_category_idx on public.documents (category);

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row
  execute function public.set_updated_at();

alter table public.documents enable row level security;

drop policy if exists "Public can read published documents" on public.documents;
create policy "Public can read published documents"
  on public.documents for select
  using (published = true or public.is_admin());

drop policy if exists "Admins can insert documents" on public.documents;
create policy "Admins can insert documents"
  on public.documents for insert
  with check (public.is_admin());

drop policy if exists "Admins can update documents" on public.documents;
create policy "Admins can update documents"
  on public.documents for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete documents" on public.documents;
create policy "Admins can delete documents"
  on public.documents for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- storage — a public bucket for uploaded documents. Public read (anyone can
-- view/download a published document, same as any other file on the site);
-- writes restricted to admins via the same is_admin() allowlist.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

drop policy if exists "Public can view document files" on storage.objects;
create policy "Public can view document files"
  on storage.objects for select
  using (bucket_id = 'documents');

drop policy if exists "Admins can upload document files" on storage.objects;
create policy "Admins can upload document files"
  on storage.objects for insert
  with check (bucket_id = 'documents' and public.is_admin());

drop policy if exists "Admins can update document files" on storage.objects;
create policy "Admins can update document files"
  on storage.objects for update
  using (bucket_id = 'documents' and public.is_admin());

drop policy if exists "Admins can delete document files" on storage.objects;
create policy "Admins can delete document files"
  on storage.objects for delete
  using (bucket_id = 'documents' and public.is_admin());
