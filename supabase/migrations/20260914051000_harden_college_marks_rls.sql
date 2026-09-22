-- ============================================================
-- CAMPUSCONNECT — HARDEN COLLEGE MARKS RLS
--
-- Removes legacy broad academic policies from college_marks.
--
-- Student:
--   read own marks only.
--
-- Faculty:
--   read/create/update/delete only marks belonging to a
--   subject assigned to them and a student in that same batch.
--
-- Main Admin:
--   full marks management.
--
-- Coordinator is intentionally NOT granted marks-management
-- access here.
-- ============================================================


alter table public.college_marks
enable row level security;


-- ============================================================
-- REMOVE LEGACY BROAD POLICIES
-- ============================================================

drop policy if exists
"Students read own academic data"
on public.college_marks;


drop policy if exists
"Academic staff create records"
on public.college_marks;


drop policy if exists
"Academic staff update records"
on public.college_marks;


drop policy if exists
"Academic staff delete records"
on public.college_marks;


-- ============================================================
-- ALSO RESET MARKS-SPECIFIC POLICIES
-- Makes this migration safe against partially applied work.
-- ============================================================

drop policy if exists
"Students read own marks"
on public.college_marks;

drop policy if exists
"Faculty read assigned subject marks"
on public.college_marks;

drop policy if exists
"Main Admin reads all marks"
on public.college_marks;

drop policy if exists
"Faculty create assigned subject marks"
on public.college_marks;

drop policy if exists
"Main Admin creates marks"
on public.college_marks;

drop policy if exists
"Faculty update assigned subject marks"
on public.college_marks;

drop policy if exists
"Main Admin updates marks"
on public.college_marks;

drop policy if exists
"Faculty delete assigned subject marks"
on public.college_marks;

drop policy if exists
"Main Admin deletes marks"
on public.college_marks;


-- ============================================================
-- STUDENT SELECT
-- ============================================================

create policy
"Students read own marks"
on public.college_marks
for select
to authenticated
using (
  student_id = auth.uid()
);


-- ============================================================
-- FACULTY SELECT
-- ============================================================

create policy
"Faculty read assigned subject marks"
on public.college_marks
for select
to authenticated
using (
  public.current_campus_role() = 'Faculty'

  and exists (
    select 1
    from public.attendance_batch_subjects bs
    where
      bs.id =
        college_marks.batch_subject_id

      and bs.batch_id =
        college_marks.batch_id

      and bs.faculty_id =
        auth.uid()
  )
);


-- ============================================================
-- MAIN ADMIN SELECT
-- ============================================================

create policy
"Main Admin reads all marks"
on public.college_marks
for select
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
);


-- ============================================================
-- FACULTY INSERT
-- ============================================================

create policy
"Faculty create assigned subject marks"
on public.college_marks
for insert
to authenticated
with check (
  public.current_campus_role() =
    'Faculty'

  and faculty_id =
    auth.uid()

  and batch_id is not null

  and batch_subject_id is not null

  and student_id is not null

  and exists (
    select 1
    from public.attendance_batch_subjects bs
    where
      bs.id =
        college_marks.batch_subject_id

      and bs.batch_id =
        college_marks.batch_id

      and bs.faculty_id =
        auth.uid()

      and lower(
        trim(bs.subject_name)
      ) =
        lower(
          trim(
            college_marks.subject_name
          )
        )

      and lower(
        trim(
          coalesce(
            bs.subject_code,
            ''
          )
        )
      ) =
        lower(
          trim(
            coalesce(
              college_marks.subject_code,
              ''
            )
          )
        )
  )

  and exists (
    select 1
    from public.attendance_batch_students student
    where
      student.batch_id =
        college_marks.batch_id

      and student.student_id =
        college_marks.student_id
  )
);


-- ============================================================
-- MAIN ADMIN INSERT
-- ============================================================

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

  and student_id is not null

  and exists (
    select 1
    from public.attendance_batch_subjects bs
    where
      bs.id =
        college_marks.batch_subject_id

      and bs.batch_id =
        college_marks.batch_id
  )

  and exists (
    select 1
    from public.attendance_batch_students student
    where
      student.batch_id =
        college_marks.batch_id

      and student.student_id =
        college_marks.student_id
  )
);


-- ============================================================
-- FACULTY UPDATE
-- ============================================================

create policy
"Faculty update assigned subject marks"
on public.college_marks
for update
to authenticated
using (
  public.current_campus_role() =
    'Faculty'

  and faculty_id =
    auth.uid()

  and exists (
    select 1
    from public.attendance_batch_subjects bs
    where
      bs.id =
        college_marks.batch_subject_id

      and bs.batch_id =
        college_marks.batch_id

      and bs.faculty_id =
        auth.uid()
  )
)
with check (
  public.current_campus_role() =
    'Faculty'

  and faculty_id =
    auth.uid()

  and batch_id is not null

  and batch_subject_id is not null

  and exists (
    select 1
    from public.attendance_batch_subjects bs
    where
      bs.id =
        college_marks.batch_subject_id

      and bs.batch_id =
        college_marks.batch_id

      and bs.faculty_id =
        auth.uid()

      and lower(
        trim(bs.subject_name)
      ) =
        lower(
          trim(
            college_marks.subject_name
          )
        )

      and lower(
        trim(
          coalesce(
            bs.subject_code,
            ''
          )
        )
      ) =
        lower(
          trim(
            coalesce(
              college_marks.subject_code,
              ''
            )
          )
        )
  )

  and exists (
    select 1
    from public.attendance_batch_students student
    where
      student.batch_id =
        college_marks.batch_id

      and student.student_id =
        college_marks.student_id
  )
);


-- ============================================================
-- MAIN ADMIN UPDATE
-- ============================================================

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


-- ============================================================
-- FACULTY DELETE
-- ============================================================

create policy
"Faculty delete assigned subject marks"
on public.college_marks
for delete
to authenticated
using (
  public.current_campus_role() =
    'Faculty'

  and faculty_id =
    auth.uid()

  and exists (
    select 1
    from public.attendance_batch_subjects bs
    where
      bs.id =
        college_marks.batch_subject_id

      and bs.batch_id =
        college_marks.batch_id

      and bs.faculty_id =
        auth.uid()
  )
);


-- ============================================================
-- MAIN ADMIN DELETE
-- ============================================================

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
