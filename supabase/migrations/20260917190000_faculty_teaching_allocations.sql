-- ============================================================
-- CAMPUSCONNECT — FACULTY TEACHING ALLOCATIONS
--
-- Purpose:
--   Adds a normalized faculty-allocation layer on top of the
--   existing attendance_batches + attendance_batch_subjects.
--
-- Existing tables are NOT replaced.
--
-- Supports:
--   - Theory faculty allocation
--   - Lab faculty allocation
--   - Section-level allocation
--   - Lab subgroup allocation (A1 / A2 / A3 etc.)
--   - Multiple faculty for the same subject
--   - Faculty workload calculation
--
-- Management:
--   Coordinator / Main Admin
--
-- Faculty:
--   Read their own allocations.
--
-- Students:
--   No direct access required in this phase.
-- ============================================================


-- ============================================================
-- 1. FACULTY TEACHING ALLOCATIONS
-- ============================================================

create table if not exists
public.faculty_teaching_allocations (
  id uuid primary key
    default gen_random_uuid(),

  batch_id uuid not null
    references public.attendance_batches(id)
    on delete cascade,

  batch_subject_id uuid not null
    references public.attendance_batch_subjects(id)
    on delete cascade,

  faculty_id uuid not null
    references auth.users(id)
    on delete cascade,

  faculty_name text not null
    default '',

  allocation_type text not null
    default 'Theory'
    check (
      allocation_type in (
        'Theory',
        'Lab',
        'Tutorial',
        'Project',
        'Mentoring'
      )
    ),

  subgroup text not null
    default '',

  weekly_hours numeric(5,2) not null
    default 0
    check (
      weekly_hours >= 0
      and weekly_hours <= 60
    ),

  is_primary boolean not null
    default true,

  status text not null
    default 'Active'
    check (
      status in (
        'Active',
        'Inactive'
      )
    ),

  notes text not null
    default '',

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  check (
    char_length(trim(subgroup)) <= 40
  )
);


-- ============================================================
-- 2. INDEXES
-- ============================================================

create index if not exists
faculty_teaching_allocations_batch_idx
on public.faculty_teaching_allocations(
  batch_id
);


create index if not exists
faculty_teaching_allocations_subject_idx
on public.faculty_teaching_allocations(
  batch_subject_id
);


create index if not exists
faculty_teaching_allocations_faculty_idx
on public.faculty_teaching_allocations(
  faculty_id,
  status
);


create index if not exists
faculty_teaching_allocations_workload_idx
on public.faculty_teaching_allocations(
  faculty_id,
  allocation_type,
  status
);


-- Prevent the same faculty allocation from being entered twice.
--
-- PostgreSQL treats NULL specially in unique indexes, therefore
-- subgroup is stored as NOT NULL default ''.

create unique index if not exists
faculty_teaching_allocations_unique_idx
on public.faculty_teaching_allocations(
  batch_subject_id,
  faculty_id,
  allocation_type,
  subgroup
);


-- ============================================================
-- 3. VALIDATION
-- ============================================================

create or replace function
public.validate_faculty_teaching_allocation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  subject_batch uuid;
begin

  select s.batch_id
  into subject_batch
  from public.attendance_batch_subjects s
  where s.id = new.batch_subject_id;

  if subject_batch is null then
    raise exception
      'Selected batch subject does not exist';
  end if;


  if subject_batch <> new.batch_id then
    raise exception
      'Selected subject does not belong to the selected batch';
  end if;


  new.faculty_name :=
    coalesce(
      nullif(
        trim(
          (
            select p.full_name
            from public.profiles p
            where p.id = new.faculty_id
            limit 1
          )
        ),
        ''
      ),
      nullif(trim(new.faculty_name), ''),
      'Faculty'
    );


  new.subgroup :=
    upper(trim(new.subgroup));


  new.notes :=
    trim(new.notes);


  new.updated_at :=
    now();


  return new;
end;
$$;


drop trigger if exists
validate_faculty_teaching_allocation_trigger
on public.faculty_teaching_allocations;


create trigger
validate_faculty_teaching_allocation_trigger
before insert or update
on public.faculty_teaching_allocations
for each row
execute function
public.validate_faculty_teaching_allocation();


-- ============================================================
-- 4. RLS
-- ============================================================

alter table
public.faculty_teaching_allocations
enable row level security;


grant select, insert, update, delete
on public.faculty_teaching_allocations
to authenticated;


-- ------------------------------------------------------------
-- READ
--
-- Faculty sees their own allocation.
-- Coordinator / Main Admin see everything.
-- ------------------------------------------------------------

drop policy if exists
"Faculty read teaching allocations"
on public.faculty_teaching_allocations;


create policy
"Faculty read teaching allocations"
on public.faculty_teaching_allocations
for select
to authenticated
using (
  faculty_id = auth.uid()

  or public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
);


-- ------------------------------------------------------------
-- CREATE
-- ------------------------------------------------------------

drop policy if exists
"Management create teaching allocations"
on public.faculty_teaching_allocations;


create policy
"Management create teaching allocations"
on public.faculty_teaching_allocations
for insert
to authenticated
with check (
  public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )

  and created_by = auth.uid()
);


-- ------------------------------------------------------------
-- UPDATE
-- ------------------------------------------------------------

drop policy if exists
"Management update teaching allocations"
on public.faculty_teaching_allocations;


create policy
"Management update teaching allocations"
on public.faculty_teaching_allocations
for update
to authenticated
using (
  public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
);


-- ------------------------------------------------------------
-- DELETE
-- ------------------------------------------------------------

drop policy if exists
"Management delete teaching allocations"
on public.faculty_teaching_allocations;


create policy
"Management delete teaching allocations"
on public.faculty_teaching_allocations
for delete
to authenticated
using (
  public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
);


-- ============================================================
-- 5. FACULTY PERSONAL ALLOCATION RPC
-- ============================================================

create or replace function
public.get_my_teaching_allocations()
returns table (
  allocation_id uuid,

  batch_id uuid,
  batch_name text,
  section text,
  department text,
  academic_year text,

  batch_subject_id uuid,
  subject_name text,
  subject_code text,
  subject_type text,
  credits integer,

  allocation_type text,
  subgroup text,
  weekly_hours numeric,
  is_primary boolean,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,

    b.id,
    b.batch_name,
    b.section,
    b.department,
    b.academic_year,

    s.id,
    s.subject_name,
    s.subject_code,
    s.subject_type,
    s.credits,

    a.allocation_type,
    a.subgroup,
    a.weekly_hours,
    a.is_primary,
    a.status

  from public.faculty_teaching_allocations a

  join public.attendance_batches b
    on b.id = a.batch_id

  join public.attendance_batch_subjects s
    on s.id = a.batch_subject_id

  where
    auth.uid() is not null

    and a.faculty_id =
      auth.uid()

    and a.status =
      'Active'

  order by
    lower(b.department),
    lower(b.batch_name),
    lower(b.section),
    lower(s.subject_name),
    lower(a.subgroup);
$$;


revoke all
on function public.get_my_teaching_allocations()
from public, anon;


grant execute
on function public.get_my_teaching_allocations()
to authenticated;


-- ============================================================
-- 6. FACULTY WORKLOAD RPC
-- ============================================================

create or replace function
public.get_my_faculty_workload()
returns table (
  total_allocations bigint,
  theory_hours numeric,
  lab_hours numeric,
  tutorial_hours numeric,
  project_hours numeric,
  mentoring_hours numeric,
  total_weekly_hours numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*)::bigint,

    coalesce(
      sum(a.weekly_hours)
        filter (
          where a.allocation_type = 'Theory'
        ),
      0
    )::numeric,

    coalesce(
      sum(a.weekly_hours)
        filter (
          where a.allocation_type = 'Lab'
        ),
      0
    )::numeric,

    coalesce(
      sum(a.weekly_hours)
        filter (
          where a.allocation_type = 'Tutorial'
        ),
      0
    )::numeric,

    coalesce(
      sum(a.weekly_hours)
        filter (
          where a.allocation_type = 'Project'
        ),
      0
    )::numeric,

    coalesce(
      sum(a.weekly_hours)
        filter (
          where a.allocation_type = 'Mentoring'
        ),
      0
    )::numeric,

    coalesce(
      sum(a.weekly_hours),
      0
    )::numeric

  from public.faculty_teaching_allocations a

  where
    auth.uid() is not null

    and a.faculty_id =
      auth.uid()

    and a.status =
      'Active';
$$;


revoke all
on function public.get_my_faculty_workload()
from public, anon;


grant execute
on function public.get_my_faculty_workload()
to authenticated;


notify pgrst, 'reload schema';
