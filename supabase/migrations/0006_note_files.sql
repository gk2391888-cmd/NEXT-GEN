-- NEXT GEN: PDF notes, papers and formula sheets uploaded by admins. Files
-- live in a private Storage bucket; the browser asks for a short-lived signed
-- link, which Storage only grants when the row allows it (free file, Pro
-- student or admin). Run once in Supabase → SQL Editor after 0005. Safe to re-run.

-- ---------------------------------------------------------------- note files
-- week is null for files that cover the whole subject (previous papers, formula sheets).
create table if not exists public.note_files (
  id          bigint generated always as identity primary key,
  subject_id  text not null check (char_length(subject_id) <= 20),
  week        integer check (week between 1 and 20),
  title       text not null check (char_length(title) between 1 and 120),
  path        text not null unique check (char_length(path) <= 300),
  size_bytes  integer not null check (size_bytes > 0),
  pro_only    boolean not null default false,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists note_files_subject_idx on public.note_files (subject_id, week);
alter table public.note_files enable row level security;
revoke all on public.note_files from anon, authenticated;
grant select on public.note_files to anon, authenticated;
grant insert, update, delete on public.note_files to authenticated;

-- Everyone sees the list (Pro files show with a lock); only admins change it.
drop policy if exists "anyone lists" on public.note_files;
create policy "anyone lists" on public.note_files for select to anon, authenticated using (true);
drop policy if exists "admin manages" on public.note_files;
create policy "admin manages" on public.note_files for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------- storage
-- Private bucket, PDFs only, up to 25 MB each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notes', 'notes', false, 26214400, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Two read policies, because guests (anon) may not call is_pro().
drop policy if exists "notes: read free files" on storage.objects;
create policy "notes: read free files" on storage.objects for select to anon, authenticated
  using (bucket_id = 'notes' and exists (select 1 from public.note_files f where f.path = storage.objects.name and not f.pro_only));
drop policy if exists "notes: read as pro or admin" on storage.objects;
create policy "notes: read as pro or admin" on storage.objects for select to authenticated
  using (
    bucket_id = 'notes'
    and ((select public.is_admin()) or (select public.is_pro((select auth.uid()))))
  );
drop policy if exists "notes: admin uploads" on storage.objects;
create policy "notes: admin uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'notes' and (select public.is_admin()));
drop policy if exists "notes: admin deletes" on storage.objects;
create policy "notes: admin deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'notes' and (select public.is_admin()));
