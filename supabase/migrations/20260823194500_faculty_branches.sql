-- ============================================================
-- CAMPUSCONNECT
-- FACULTY DIRECTORY — BRANCH MANAGEMENT
-- ============================================================

create table if not exists public.faculty_branches (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,
  title text not null,

  tagline text not null default '',
  description text not null default '',

  logo_url text,
  banner_url text,

  display_order integer not null default 100,

  status text not null default 'Active'
    check (status in ('Active','Inactive')),

  created_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


alter table public.faculty_branches
enable row level security;


drop policy if exists
"Faculty branches authenticated read"
on public.faculty_branches;

create policy
"Faculty branches authenticated read"
on public.faculty_branches
for select
to authenticated
using (
  status = 'Active'
  or public.current_campus_role() = 'Main Admin'
);


drop policy if exists
"Main Admin creates faculty branches"
on public.faculty_branches;

create policy
"Main Admin creates faculty branches"
on public.faculty_branches
for insert
to authenticated
with check (
  public.current_campus_role() = 'Main Admin'
);


drop policy if exists
"Main Admin updates faculty branches"
on public.faculty_branches;

create policy
"Main Admin updates faculty branches"
on public.faculty_branches
for update
to authenticated
using (
  public.current_campus_role() = 'Main Admin'
)
with check (
  public.current_campus_role() = 'Main Admin'
);


drop policy if exists
"Main Admin deletes faculty branches"
on public.faculty_branches;

create policy
"Main Admin deletes faculty branches"
on public.faculty_branches
for delete
to authenticated
using (
  public.current_campus_role() = 'Main Admin'
);


-- ============================================================
-- INITIAL BRANCHES
-- ============================================================

insert into public.faculty_branches (
  code,
  title,
  tagline,
  description,
  display_order
)
values

(
  'ECE',
  'Electronics & Communication Engineering',
  'Circuits · Communication · Intelligence',
  'Explore faculty expertise across VLSI, embedded systems, communication systems, signal processing and electronics.',
  10
),

(
  'CSE',
  'Computer Science & Engineering',
  'Software · Systems · Computing',
  'Explore faculty expertise across software engineering, systems, artificial intelligence and computing.',
  20
),

(
  'ISE',
  'Information Science & Engineering',
  'Information · Data · Platforms',
  'Explore faculty expertise across information systems, software platforms and data technologies.',
  30
),

(
  'EEE',
  'Electrical & Electronics Engineering',
  'Power · Control · Electronics',
  'Explore faculty expertise across power systems, control engineering and electronics.',
  40
)

on conflict (code)
do nothing;


-- ============================================================
-- STORAGE BUCKET
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'faculty-branches',
  'faculty-branches',
  true,
  10485760
)
on conflict (id)
do update set
  public = true,
  file_size_limit = 10485760;


drop policy if exists
"Faculty branch media public read"
on storage.objects;

create policy
"Faculty branch media public read"
on storage.objects
for select
to public
using (
  bucket_id = 'faculty-branches'
);


drop policy if exists
"Main Admin uploads faculty branch media"
on storage.objects;

create policy
"Main Admin uploads faculty branch media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'faculty-branches'
  and public.current_campus_role() = 'Main Admin'
);


drop policy if exists
"Main Admin updates faculty branch media"
on storage.objects;

create policy
"Main Admin updates faculty branch media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'faculty-branches'
  and public.current_campus_role() = 'Main Admin'
)
with check (
  bucket_id = 'faculty-branches'
  and public.current_campus_role() = 'Main Admin'
);


drop policy if exists
"Main Admin deletes faculty branch media"
on storage.objects;

create policy
"Main Admin deletes faculty branch media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'faculty-branches'
  and public.current_campus_role() = 'Main Admin'
);


notify pgrst, 'reload schema';
