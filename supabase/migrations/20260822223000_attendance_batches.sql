-- =========================================================
-- CAMPUSCONNECT ATTENDANCE BATCH SYSTEM
-- =========================================================

create table if not exists public.attendance_batches (
  id uuid primary key default gen_random_uuid(),

  batch_name text not null,
  section text not null,

  department text not null default 'All',
  academic_year text not null default '',
  semester text not null default '',

  total_students integer not null default 0
    check (total_students >= 0),

  created_by uuid not null
    references auth.users(id)
    on delete cascade,

  created_by_name text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    batch_name,
    section,
    department,
    academic_year,
    created_by
  )
);


create table if not exists public.attendance_batch_students (
  id uuid primary key default gen_random_uuid(),

  batch_id uuid not null
    references public.attendance_batches(id)
    on delete cascade,

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  student_name text not null,

  campus_uid text not null,

  department text not null default '',
  graduation_year text not null default '',

  roll_number text not null default '',

  added_by uuid
    references auth.users(id)
    on delete set null,

  added_at timestamptz not null default now(),

  unique (
    batch_id,
    student_id
  )
);


create index if not exists attendance_batches_creator_idx
on public.attendance_batches(created_by);

create index if not exists attendance_batches_department_idx
on public.attendance_batches(
  department,
  section
);

create index if not exists attendance_batch_students_batch_idx
on public.attendance_batch_students(batch_id);

create index if not exists attendance_batch_students_uid_idx
on public.attendance_batch_students(campus_uid);


-- =========================================================
-- AUTOMATIC TOTAL STUDENT COUNT
-- =========================================================

create or replace function public.update_attendance_batch_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_batch uuid;
begin
  target_batch :=
    case
      when tg_op = 'DELETE'
        then old.batch_id
      else new.batch_id
    end;

  update public.attendance_batches
  set
    total_students = (
      select count(*)
      from public.attendance_batch_students abs
      where abs.batch_id = target_batch
    ),
    updated_at = now()
  where id = target_batch;

  return coalesce(new, old);
end;
$$;


drop trigger if exists attendance_batch_student_total_trigger
on public.attendance_batch_students;

create trigger attendance_batch_student_total_trigger
after insert or delete
on public.attendance_batch_students
for each row
execute procedure public.update_attendance_batch_total();


-- =========================================================
-- UID LOOKUP FOR FACULTY
-- =========================================================

create or replace function public.find_attendance_student_by_uid(
  target_uid text
)
returns table (
  id uuid,
  full_name text,
  campus_uid text,
  department text,
  graduation_year text,
  email text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.full_name,
    p.campus_uid,
    p.department,
    p.graduation_year,
    p.email
  from public.profiles p
  where
    upper(p.campus_uid) =
      upper(trim(target_uid))
    and p.role = 'Student'
  limit 1;
$$;


revoke all
on function public.find_attendance_student_by_uid(text)
from public;

grant execute
on function public.find_attendance_student_by_uid(text)
to authenticated;


-- =========================================================
-- RLS
-- =========================================================

alter table public.attendance_batches
enable row level security;

alter table public.attendance_batch_students
enable row level security;


grant select, insert, update, delete
on public.attendance_batches
to authenticated;

grant select, insert, update, delete
on public.attendance_batch_students
to authenticated;


-- Faculty / Coordinator / Admin can read batches

drop policy if exists "Staff read attendance batches"
on public.attendance_batches;

create policy "Staff read attendance batches"
on public.attendance_batches
for select
to authenticated
using (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


-- Faculty / Coordinator / Admin create batches

drop policy if exists "Staff create attendance batches"
on public.attendance_batches;

create policy "Staff create attendance batches"
on public.attendance_batches
for insert
to authenticated
with check (
  created_by = auth.uid()
  and
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists "Staff update attendance batches"
on public.attendance_batches;

create policy "Staff update attendance batches"
on public.attendance_batches
for update
to authenticated
using (
  created_by = auth.uid()
  or
  public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
)
with check (
  created_by = auth.uid()
  or
  public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists "Staff delete attendance batches"
on public.attendance_batches;

create policy "Staff delete attendance batches"
on public.attendance_batches
for delete
to authenticated
using (
  created_by = auth.uid()
  or
  public.current_campus_role() = 'Main Admin'
);


-- Batch roster

drop policy if exists "Staff read batch students"
on public.attendance_batch_students;

create policy "Staff read batch students"
on public.attendance_batch_students
for select
to authenticated
using (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists "Staff add batch students"
on public.attendance_batch_students;

create policy "Staff add batch students"
on public.attendance_batch_students
for insert
to authenticated
with check (
  added_by = auth.uid()
  and
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists "Staff remove batch students"
on public.attendance_batch_students;

create policy "Staff remove batch students"
on public.attendance_batch_students
for delete
to authenticated
using (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);

