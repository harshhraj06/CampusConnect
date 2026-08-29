-- ============================================================
-- CAMPUSCONNECT — MEET OUR FACULTY
-- ============================================================

create table if not exists public.campus_faculty (
  id uuid primary key default gen_random_uuid(),

  full_name text not null,
  department text not null,
  designation text not null default 'Assistant Professor',

  qualification text not null default '',
  specialization text not null default '',
  experience text not null default '',
  bio text not null default '',

  email text not null default '',

  photo_url text,
  profile_url text,

  is_hod boolean not null default false,
  is_featured boolean not null default false,

  display_order integer not null default 100,

  status text not null default 'Active'
    check (status in ('Active', 'Inactive')),

  created_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists
campus_faculty_department_idx
on public.campus_faculty(
  department,
  display_order
);


create index if not exists
campus_faculty_hod_idx
on public.campus_faculty(
  department,
  is_hod
);


-- ============================================================
-- RLS
-- ============================================================

alter table public.campus_faculty
enable row level security;


drop policy if exists
"Authenticated users view faculty"
on public.campus_faculty;

drop policy if exists
"Main Admin creates faculty"
on public.campus_faculty;

drop policy if exists
"Main Admin updates faculty"
on public.campus_faculty;

drop policy if exists
"Main Admin deletes faculty"
on public.campus_faculty;


create policy
"Authenticated users view faculty"
on public.campus_faculty
for select
to authenticated
using (
  status = 'Active'
  or public.current_campus_role() = 'Main Admin'
);


create policy
"Main Admin creates faculty"
on public.campus_faculty
for insert
to authenticated
with check (
  public.current_campus_role() = 'Main Admin'
);


create policy
"Main Admin updates faculty"
on public.campus_faculty
for update
to authenticated
using (
  public.current_campus_role() = 'Main Admin'
)
with check (
  public.current_campus_role() = 'Main Admin'
);


create policy
"Main Admin deletes faculty"
on public.campus_faculty
for delete
to authenticated
using (
  public.current_campus_role() = 'Main Admin'
);


-- ============================================================
-- FACULTY IMAGE STORAGE
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'faculty-media',
  'faculty-media',
  true,
  10485760
)
on conflict (id)
do update set
  public = true,
  file_size_limit = 10485760;


drop policy if exists
"Faculty media public read"
on storage.objects;

drop policy if exists
"Main Admin uploads faculty media"
on storage.objects;

drop policy if exists
"Main Admin updates faculty media"
on storage.objects;

drop policy if exists
"Main Admin deletes faculty media"
on storage.objects;


create policy
"Faculty media public read"
on storage.objects
for select
to public
using (
  bucket_id = 'faculty-media'
);


create policy
"Main Admin uploads faculty media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'faculty-media'
  and public.current_campus_role() = 'Main Admin'
);


create policy
"Main Admin updates faculty media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'faculty-media'
  and public.current_campus_role() = 'Main Admin'
)
with check (
  bucket_id = 'faculty-media'
  and public.current_campus_role() = 'Main Admin'
);


create policy
"Main Admin deletes faculty media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'faculty-media'
  and public.current_campus_role() = 'Main Admin'
);


notify pgrst, 'reload schema';
