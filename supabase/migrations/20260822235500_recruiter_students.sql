-- =========================================================
-- CAMPUSCONNECT
-- RECRUITER PLACED STUDENTS
-- =========================================================

create table if not exists public.campus_recruiter_students (
  id uuid primary key default gen_random_uuid(),

  recruiter_id uuid not null
    references public.campus_recruiters(id)
    on delete cascade,

  student_name text not null,

  student_photo_url text,

  package_lpa text not null default '',

  job_role text not null default '',

  department text not null default '',

  display_order integer not null default 0,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists
campus_recruiter_students_recruiter_idx
on public.campus_recruiter_students(
  recruiter_id,
  display_order,
  created_at
);

alter table public.campus_recruiter_students
enable row level security;

grant select, insert, update, delete
on public.campus_recruiter_students
to authenticated;


drop policy if exists
"Campus users read recruiter students"
on public.campus_recruiter_students;

create policy
"Campus users read recruiter students"
on public.campus_recruiter_students
for select
to authenticated
using (true);


drop policy if exists
"Staff create recruiter students"
on public.campus_recruiter_students;

create policy
"Staff create recruiter students"
on public.campus_recruiter_students
for insert
to authenticated
with check (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  )
);


drop policy if exists
"Staff update recruiter students"
on public.campus_recruiter_students;

create policy
"Staff update recruiter students"
on public.campus_recruiter_students
for update
to authenticated
using (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  )
);


drop policy if exists
"Staff delete recruiter students"
on public.campus_recruiter_students;

create policy
"Staff delete recruiter students"
on public.campus_recruiter_students
for delete
to authenticated
using (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  )
);

