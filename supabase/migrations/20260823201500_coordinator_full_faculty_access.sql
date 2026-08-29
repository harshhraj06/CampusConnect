-- ============================================================
-- CAMPUSCONNECT
-- COORDINATOR FULL FACULTY DIRECTORY ACCESS
-- ============================================================
--
-- Coordinator + Main Admin:
--   View faculty          ✅
--   Add faculty           ✅
--   Edit faculty          ✅
--   Delete faculty        ✅
--   Excel import          ✅
--   Add branches          ✅
--   Edit branches         ✅
--   Delete branches       ✅
--   Upload faculty media  ✅
--   Upload branch media   ✅
-- ============================================================


-- ============================================================
-- FACULTY TABLE
-- ============================================================

alter table public.campus_faculty
enable row level security;


drop policy if exists
"Coordinator can create faculty"
on public.campus_faculty;

create policy
"Coordinator can create faculty"
on public.campus_faculty
for insert
to authenticated
with check (
  public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Coordinator can edit faculty"
on public.campus_faculty;

create policy
"Coordinator can edit faculty"
on public.campus_faculty
for update
to authenticated
using (
  public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Coordinator can delete faculty"
on public.campus_faculty;

create policy
"Coordinator can delete faculty"
on public.campus_faculty
for delete
to authenticated
using (
  public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
);


-- ============================================================
-- FACULTY BRANCHES
-- ============================================================

alter table public.faculty_branches
enable row level security;


drop policy if exists
"Main Admin creates faculty branches"
on public.faculty_branches;

drop policy if exists
"Main Admin updates faculty branches"
on public.faculty_branches;

drop policy if exists
"Main Admin deletes faculty branches"
on public.faculty_branches;


drop policy if exists
"Coordinator manages faculty branches insert"
on public.faculty_branches;

create policy
"Coordinator manages faculty branches insert"
on public.faculty_branches
for insert
to authenticated
with check (
  public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Coordinator manages faculty branches update"
on public.faculty_branches;

create policy
"Coordinator manages faculty branches update"
on public.faculty_branches
for update
to authenticated
using (
  public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Coordinator manages faculty branches delete"
on public.faculty_branches;

create policy
"Coordinator manages faculty branches delete"
on public.faculty_branches
for delete
to authenticated
using (
  public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
);


-- ============================================================
-- FACULTY MEDIA STORAGE
-- ============================================================

drop policy if exists
"Coordinator uploads faculty media"
on storage.objects;

create policy
"Coordinator uploads faculty media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'faculty-media'
  and public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Coordinator updates faculty media"
on storage.objects;

create policy
"Coordinator updates faculty media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'faculty-media'
  and public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
)
with check (
  bucket_id = 'faculty-media'
  and public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Coordinator deletes faculty media"
on storage.objects;

create policy
"Coordinator deletes faculty media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'faculty-media'
  and public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
);


-- ============================================================
-- FACULTY BRANCH MEDIA
-- ============================================================

drop policy if exists
"Main Admin uploads faculty branch media"
on storage.objects;

drop policy if exists
"Main Admin updates faculty branch media"
on storage.objects;

drop policy if exists
"Main Admin deletes faculty branch media"
on storage.objects;


drop policy if exists
"Coordinator uploads faculty branch media"
on storage.objects;

create policy
"Coordinator uploads faculty branch media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'faculty-branches'
  and public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Coordinator updates faculty branch media"
on storage.objects;

create policy
"Coordinator updates faculty branch media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'faculty-branches'
  and public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
)
with check (
  bucket_id = 'faculty-branches'
  and public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Coordinator deletes faculty branch media"
on storage.objects;

create policy
"Coordinator deletes faculty branch media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'faculty-branches'
  and public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
);


-- ============================================================
-- EXCEL BULK IMPORT
-- ============================================================

create or replace function public.can_manage_faculty_directory()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and public.current_campus_role()
      in (
        'Coordinator',
        'Main Admin'
      );
$$;


grant execute
on function public.can_manage_faculty_directory()
to authenticated;


notify pgrst, 'reload schema';
