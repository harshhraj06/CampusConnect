-- ============================================================
-- CAMPUSCONNECT — BATCH MARKS MANAGEMENT
--
-- Faculty:
--   can manage marks only for subjects assigned to them
--   and students belonging to the same batch.
--
-- Main Admin:
--   can manage all marks.
--
-- Student:
--   can read only own marks.
--
-- Existing college_marks rows remain compatible.
-- ============================================================


-- ------------------------------------------------------------
-- EXTEND EXISTING COLLEGE_MARKS
-- ------------------------------------------------------------

alter table public.college_marks
add column if not exists batch_id uuid
references public.attendance_batches(id)
on delete set null;


alter table public.college_marks
add column if not exists batch_subject_id uuid
references public.attendance_batch_subjects(id)
on delete set null;


alter table public.college_marks
add column if not exists faculty_id uuid
references auth.users(id)
on delete set null;


alter table public.college_marks
add column if not exists faculty_name text
not null
default '';


alter table public.college_marks
add column if not exists assessment_type text
not null
default '';


alter table public.college_marks
add column if not exists assessment_number integer;


alter table public.college_marks
add column if not exists remarks text
not null
default '';


-- ------------------------------------------------------------
-- VALIDATION
--
-- NOT VALID keeps legacy rows safe while enforcing these rules
-- for all new/updated rows.
-- ------------------------------------------------------------

alter table public.college_marks
drop constraint if exists
college_marks_marks_nonnegative;


alter table public.college_marks
add constraint
college_marks_marks_nonnegative
check (
  marks is null
  or marks >= 0
)
not valid;


alter table public.college_marks
drop constraint if exists
college_marks_max_marks_positive;


alter table public.college_marks
add constraint
college_marks_max_marks_positive
check (
  max_marks is null
  or max_marks > 0
)
not valid;


alter table public.college_marks
drop constraint if exists
college_marks_marks_within_max;


alter table public.college_marks
add constraint
college_marks_marks_within_max
check (
  marks is null
  or max_marks is null
  or marks <= max_marks
)
not valid;


alter table public.college_marks
drop constraint if exists
college_marks_assessment_number_positive;


alter table public.college_marks
add constraint
college_marks_assessment_number_positive
check (
  assessment_number is null
  or assessment_number > 0
)
not valid;


-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

create index if not exists
college_marks_batch_idx
on public.college_marks(
  batch_id
);


create index if not exists
college_marks_batch_subject_idx
on public.college_marks(
  batch_subject_id
);


create index if not exists
college_marks_faculty_idx
on public.college_marks(
  faculty_id
);


create index if not exists
college_marks_student_subject_idx
on public.college_marks(
  student_id,
  batch_subject_id
);


-- Prevent duplicate assessment such as:
--
-- same student + VLSI + Internal 1
-- being inserted twice.
--
-- Legacy rows with null batch_subject_id are unaffected.

create unique index if not exists
college_marks_unique_student_assessment_idx
on public.college_marks(
  student_id,
  batch_subject_id,
  lower(assessment_type),
  assessment_number
)
where
  batch_subject_id is not null
  and assessment_type <> ''
  and assessment_number is not null;


-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.college_marks
enable row level security;


grant select, insert, update, delete
on public.college_marks
to authenticated;


-- ------------------------------------------------------------
-- SELECT
-- ------------------------------------------------------------

drop policy if exists
"Students read own marks"
on public.college_marks;

create policy
"Students read own marks"
on public.college_marks
for select
to authenticated
using (
  student_id = auth.uid()
);


drop policy if exists
"Faculty read assigned subject marks"
on public.college_marks;

create policy
"Faculty read assigned subject marks"
on public.college_marks
for select
to authenticated
using (
  public.current_campus_role() = 'Faculty'
  and exists (
    select 1
    from public.attendance_batch_subjects abs
    where
      abs.id =
        college_marks.batch_subject_id
      and abs.faculty_id =
        auth.uid()
  )
);


drop policy if exists
"Main Admin reads all marks"
on public.college_marks;

create policy
"Main Admin reads all marks"
on public.college_marks
for select
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
);


-- ------------------------------------------------------------
-- INSERT
-- ------------------------------------------------------------

drop policy if exists
"Faculty create assigned subject marks"
on public.college_marks;

create policy
"Faculty create assigned subject marks"
on public.college_marks
for insert
to authenticated
with check (
  public.current_campus_role() =
    'Faculty'

  and faculty_id = auth.uid()

  and batch_id is not null

  and batch_subject_id is not null

  and exists (
    select 1
    from public.attendance_batch_subjects abs
    where
      abs.id =
        college_marks.batch_subject_id

      and abs.batch_id =
        college_marks.batch_id

      and abs.faculty_id =
        auth.uid()

      and lower(
        trim(abs.subject_name)
      ) =
        lower(
          trim(
            college_marks.subject_name
          )
        )
  )

  and exists (
    select 1
    from public.attendance_batch_students abstudent
    where
      abstudent.batch_id =
        college_marks.batch_id

      and abstudent.student_id =
        college_marks.student_id
  )
);


drop policy if exists
"Main Admin creates marks"
on public.college_marks;

create policy
"Main Admin creates marks"
on public.college_marks
for insert
to authenticated
with check (
  public.current_campus_role() =
    'Main Admin'

  and batch_id is not null

  and batch_subject_id is not null

  and exists (
    select 1
    from public.attendance_batch_subjects abs
    where
      abs.id =
        college_marks.batch_subject_id

      and abs.batch_id =
        college_marks.batch_id
  )

  and exists (
    select 1
    from public.attendance_batch_students abstudent
    where
      abstudent.batch_id =
        college_marks.batch_id

      and abstudent.student_id =
        college_marks.student_id
  )
);


-- ------------------------------------------------------------
-- UPDATE
-- ------------------------------------------------------------

drop policy if exists
"Faculty update assigned subject marks"
on public.college_marks;

create policy
"Faculty update assigned subject marks"
on public.college_marks
for update
to authenticated
using (
  public.current_campus_role() =
    'Faculty'

  and faculty_id = auth.uid()

  and exists (
    select 1
    from public.attendance_batch_subjects abs
    where
      abs.id =
        college_marks.batch_subject_id

      and abs.faculty_id =
        auth.uid()
  )
)
with check (
  public.current_campus_role() =
    'Faculty'

  and faculty_id = auth.uid()

  and batch_id is not null

  and batch_subject_id is not null

  and exists (
    select 1
    from public.attendance_batch_subjects abs
    where
      abs.id =
        college_marks.batch_subject_id

      and abs.batch_id =
        college_marks.batch_id

      and abs.faculty_id =
        auth.uid()

      and lower(
        trim(abs.subject_name)
      ) =
        lower(
          trim(
            college_marks.subject_name
          )
        )
  )

  and exists (
    select 1
    from public.attendance_batch_students abstudent
    where
      abstudent.batch_id =
        college_marks.batch_id

      and abstudent.student_id =
        college_marks.student_id
  )
);


drop policy if exists
"Main Admin updates marks"
on public.college_marks;

create policy
"Main Admin updates marks"
on public.college_marks
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
-- DELETE
-- ------------------------------------------------------------

drop policy if exists
"Faculty delete assigned subject marks"
on public.college_marks;

create policy
"Faculty delete assigned subject marks"
on public.college_marks
for delete
to authenticated
using (
  public.current_campus_role() =
    'Faculty'

  and faculty_id = auth.uid()

  and exists (
    select 1
    from public.attendance_batch_subjects abs
    where
      abs.id =
        college_marks.batch_subject_id

      and abs.faculty_id =
        auth.uid()
  )
);


drop policy if exists
"Main Admin deletes marks"
on public.college_marks;

create policy
"Main Admin deletes marks"
on public.college_marks
for delete
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
);


notify pgrst, 'reload schema';
