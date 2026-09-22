-- ============================================================
-- CAMPUSCONNECT — BATCH TIMETABLE MANAGEMENT
--
-- Faculty:
--   Can publish timetable entries only for subjects assigned
--   to them in attendance_batch_subjects.
--
-- Main Admin:
--   Can manage all timetable entries.
--
-- Student:
--   Can read timetable entries only for batches they belong to.
--
-- Existing college_timetable is preserved as legacy/fallback.
-- ============================================================


-- ============================================================
-- BATCH TIMETABLE
-- ============================================================

create table if not exists
public.batch_timetable_entries (
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

  day_of_week text not null
    check (
      day_of_week in (
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
      )
    ),

  period_order integer not null
    default 1
    check (
      period_order
      between 1 and 20
    ),

  start_time time not null,

  end_time time not null,

  room text not null
    default '',

  class_type text not null
    default 'Lecture',

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
    end_time > start_time
  )
);


-- One batch should not have two subjects occupying the
-- same logical period on the same day.

create unique index if not exists
batch_timetable_period_unique_idx
on public.batch_timetable_entries(
  batch_id,
  day_of_week,
  period_order
);


create index if not exists
batch_timetable_batch_idx
on public.batch_timetable_entries(
  batch_id,
  day_of_week,
  period_order
);


create index if not exists
batch_timetable_subject_idx
on public.batch_timetable_entries(
  batch_subject_id
);


create index if not exists
batch_timetable_faculty_idx
on public.batch_timetable_entries(
  faculty_id,
  day_of_week,
  start_time
);


-- ============================================================
-- PREVENT REAL TIME OVERLAPS
-- ============================================================

create or replace function
public.validate_batch_timetable_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  -- ----------------------------------------------------------
  -- Subject must belong to selected batch.
  -- Faculty must match the configured subject faculty unless
  -- Main Admin is creating the row.
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.attendance_batch_subjects bs
    where
      bs.id = new.batch_subject_id
      and bs.batch_id = new.batch_id
      and (
        bs.faculty_id = new.faculty_id
        or public.current_campus_role() = 'Main Admin'
      )
  ) then
    raise exception
      'Selected subject does not belong to this batch/faculty';
  end if;


  -- ----------------------------------------------------------
  -- Prevent overlapping classes for the same batch.
  -- ----------------------------------------------------------

  if exists (
    select 1
    from public.batch_timetable_entries existing
    where
      existing.batch_id = new.batch_id
      and existing.day_of_week = new.day_of_week
      and existing.id <> new.id
      and new.start_time < existing.end_time
      and new.end_time > existing.start_time
  ) then
    raise exception
      'This batch already has a class during the selected time';
  end if;


  -- ----------------------------------------------------------
  -- Prevent the same faculty from being scheduled in two
  -- different batches at the same time.
  -- ----------------------------------------------------------

  if exists (
    select 1
    from public.batch_timetable_entries existing
    where
      existing.faculty_id = new.faculty_id
      and existing.day_of_week = new.day_of_week
      and existing.id <> new.id
      and new.start_time < existing.end_time
      and new.end_time > existing.start_time
  ) then
    raise exception
      'Faculty already has another class during this time';
  end if;


  new.updated_at = now();

  return new;
end;
$$;


drop trigger if exists
validate_batch_timetable_entry_trigger
on public.batch_timetable_entries;


create trigger
validate_batch_timetable_entry_trigger
before insert or update
on public.batch_timetable_entries
for each row
execute function
public.validate_batch_timetable_entry();


-- ============================================================
-- RLS
-- ============================================================

alter table
public.batch_timetable_entries
enable row level security;


grant select, insert, update, delete
on public.batch_timetable_entries
to authenticated;


-- ------------------------------------------------------------
-- STUDENT READ
-- ------------------------------------------------------------

drop policy if exists
"Students read own batch timetable"
on public.batch_timetable_entries;


create policy
"Students read own batch timetable"
on public.batch_timetable_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.attendance_batch_students student
    where
      student.batch_id =
        batch_timetable_entries.batch_id

      and student.student_id =
        auth.uid()
  )
);


-- ------------------------------------------------------------
-- FACULTY READ
-- ------------------------------------------------------------

drop policy if exists
"Faculty read assigned timetable"
on public.batch_timetable_entries;


create policy
"Faculty read assigned timetable"
on public.batch_timetable_entries
for select
to authenticated
using (
  public.current_campus_role() =
    'Faculty'

  and exists (
    select 1
    from public.attendance_batch_subjects subject
    where
      subject.id =
        batch_timetable_entries.batch_subject_id

      and subject.batch_id =
        batch_timetable_entries.batch_id

      and subject.faculty_id =
        auth.uid()
  )
);


-- ------------------------------------------------------------
-- MAIN ADMIN READ
-- ------------------------------------------------------------

drop policy if exists
"Main Admin reads timetable"
on public.batch_timetable_entries;


create policy
"Main Admin reads timetable"
on public.batch_timetable_entries
for select
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
);


-- ------------------------------------------------------------
-- FACULTY INSERT
-- ------------------------------------------------------------

drop policy if exists
"Faculty creates assigned timetable"
on public.batch_timetable_entries;


create policy
"Faculty creates assigned timetable"
on public.batch_timetable_entries
for insert
to authenticated
with check (
  public.current_campus_role() =
    'Faculty'

  and faculty_id =
    auth.uid()

  and created_by =
    auth.uid()

  and exists (
    select 1
    from public.attendance_batch_subjects subject
    where
      subject.id =
        batch_timetable_entries.batch_subject_id

      and subject.batch_id =
        batch_timetable_entries.batch_id

      and subject.faculty_id =
        auth.uid()
  )
);


-- ------------------------------------------------------------
-- MAIN ADMIN INSERT
-- ------------------------------------------------------------

drop policy if exists
"Main Admin creates timetable"
on public.batch_timetable_entries;


create policy
"Main Admin creates timetable"
on public.batch_timetable_entries
for insert
to authenticated
with check (
  public.current_campus_role() =
    'Main Admin'

  and created_by =
    auth.uid()

  and exists (
    select 1
    from public.attendance_batch_subjects subject
    where
      subject.id =
        batch_timetable_entries.batch_subject_id

      and subject.batch_id =
        batch_timetable_entries.batch_id
  )
);


-- ------------------------------------------------------------
-- FACULTY UPDATE
-- ------------------------------------------------------------

drop policy if exists
"Faculty updates assigned timetable"
on public.batch_timetable_entries;


create policy
"Faculty updates assigned timetable"
on public.batch_timetable_entries
for update
to authenticated
using (
  public.current_campus_role() =
    'Faculty'

  and faculty_id =
    auth.uid()
)
with check (
  public.current_campus_role() =
    'Faculty'

  and faculty_id =
    auth.uid()

  and exists (
    select 1
    from public.attendance_batch_subjects subject
    where
      subject.id =
        batch_timetable_entries.batch_subject_id

      and subject.batch_id =
        batch_timetable_entries.batch_id

      and subject.faculty_id =
        auth.uid()
  )
);


-- ------------------------------------------------------------
-- MAIN ADMIN UPDATE
-- ------------------------------------------------------------

drop policy if exists
"Main Admin updates timetable"
on public.batch_timetable_entries;


create policy
"Main Admin updates timetable"
on public.batch_timetable_entries
for update
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
)
with check (
  public.current_campus_role() =
    'Main Admin'
);


-- ------------------------------------------------------------
-- FACULTY DELETE
-- ------------------------------------------------------------

drop policy if exists
"Faculty deletes assigned timetable"
on public.batch_timetable_entries;


create policy
"Faculty deletes assigned timetable"
on public.batch_timetable_entries
for delete
to authenticated
using (
  public.current_campus_role() =
    'Faculty'

  and faculty_id =
    auth.uid()
);


-- ------------------------------------------------------------
-- MAIN ADMIN DELETE
-- ------------------------------------------------------------

drop policy if exists
"Main Admin deletes timetable"
on public.batch_timetable_entries;


create policy
"Main Admin deletes timetable"
on public.batch_timetable_entries
for delete
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
);


-- ============================================================
-- STUDENT TIMETABLE RPC
--
-- Returns batch timetable plus any legacy college_timetable
-- rows that do not already have a matching batch entry.
--
-- Output intentionally matches the fields already used by
-- the Student Academics timetable UI.
-- ============================================================

create or replace function
public.get_my_timetable()
returns table (
  id uuid,
  semester integer,
  day_of_week text,
  period_order integer,
  start_time time,
  end_time time,
  subject_code text,
  subject_name text,
  faculty_name text,
  room text,
  class_type text,
  source text
)
language sql
stable
security definer
set search_path = ''
as $$

  -- ----------------------------------------------------------
  -- New batch timetable
  -- ----------------------------------------------------------

  select
    entry.id,

    case
      when batch.semester ~ '^[0-9]+$'
        then batch.semester::integer
      else null
    end as semester,

    entry.day_of_week,
    entry.period_order,
    entry.start_time,
    entry.end_time,

    subject.subject_code,
    subject.subject_name,

    coalesce(
      nullif(
        trim(entry.faculty_name),
        ''
      ),
      subject.faculty_name
    ) as faculty_name,

    entry.room,
    entry.class_type,

    'batch'::text
      as source

  from public.batch_timetable_entries entry

  join public.attendance_batches batch
    on batch.id =
      entry.batch_id

  join public.attendance_batch_subjects subject
    on subject.id =
      entry.batch_subject_id

  join public.attendance_batch_students membership
    on membership.batch_id =
      entry.batch_id

  where
    auth.uid() is not null

    and membership.student_id =
      auth.uid()


  union all


  -- ----------------------------------------------------------
  -- Existing legacy student timetable
  -- ----------------------------------------------------------

  select
    legacy.id,
    legacy.semester,
    legacy.day_of_week,
    legacy.period_order,
    legacy.start_time,
    legacy.end_time,
    legacy.subject_code,
    legacy.subject_name,
    legacy.faculty_name,
    legacy.room,
    legacy.class_type,

    'legacy'::text
      as source

  from public.college_timetable legacy

  where
    auth.uid() is not null

    and legacy.student_id =
      auth.uid()

    and not exists (
      select 1
      from public.batch_timetable_entries entry

      join public.attendance_batch_students membership
        on membership.batch_id =
          entry.batch_id

      join public.attendance_batch_subjects subject
        on subject.id =
          entry.batch_subject_id

      where
        membership.student_id =
          auth.uid()

        and lower(entry.day_of_week) =
          lower(legacy.day_of_week)

        and entry.period_order =
          legacy.period_order

        and lower(
          trim(subject.subject_name)
        ) =
          lower(
            trim(
              legacy.subject_name
            )
          )
    )


  order by
    day_of_week,
    period_order,
    start_time;

$$;


revoke all
on function public.get_my_timetable()
from public, anon;


grant execute
on function public.get_my_timetable()
to authenticated;


notify pgrst, 'reload schema';
