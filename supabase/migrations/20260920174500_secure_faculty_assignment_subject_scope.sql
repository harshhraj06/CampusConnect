-- ============================================================
-- CAMPUSCONNECT
-- Secure Faculty Assignment Subject Scope
--
-- Goals:
-- 1. Link academic assignments to attendance_batch_subjects.
-- 2. Faculty may create/update assignments only for subjects
--    actually assigned to them.
-- 3. Subject must belong to the selected target batch.
-- 4. Faculty may read submissions only for assignments they own.
-- 5. Students may submit only assignments actually visible to them.
-- ============================================================


-- ============================================================
-- 1. REAL SUBJECT IDENTITY
-- ============================================================

alter table public.assignments
add column if not exists batch_subject_id uuid
references public.attendance_batch_subjects(id)
on delete set null;


create index if not exists
assignments_batch_subject_idx
on public.assignments(batch_subject_id);


create index if not exists
assignments_batch_subject_batch_idx
on public.assignments(
  audience_batch_id,
  batch_subject_id
);


-- ============================================================
-- 2. BEST-EFFORT BACKFILL OF EXISTING ASSIGNMENTS
--
-- Only backfill when exactly one subject in the target batch
-- matches the existing subject text.
-- ============================================================

with candidate_matches as (
  select
    a.id as assignment_id,
    min(abs.id::text)::uuid as batch_subject_id,
    count(*) as match_count
  from public.assignments a
  join public.attendance_batch_subjects abs
    on abs.batch_id = a.audience_batch_id
   and (
     lower(trim(abs.subject_name)) =
       lower(trim(a.subject))
     or
     lower(trim(abs.subject_code)) =
       lower(trim(a.subject))
   )
  where
    a.batch_subject_id is null
    and a.audience_batch_id is not null
  group by
    a.id
)
update public.assignments a
set
  batch_subject_id =
    candidate_matches.batch_subject_id
from candidate_matches
where
  candidate_matches.assignment_id =
    a.id
  and candidate_matches.match_count = 1;


-- ============================================================
-- 3. DATABASE-LEVEL BATCH/SUBJECT CONSISTENCY
-- ============================================================

create or replace function
public.validate_assignment_subject_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  subject_batch_id uuid;
  subject_name_value text;
begin

  if new.batch_subject_id is not null then

    select
      abs.batch_id,
      abs.subject_name
    into
      subject_batch_id,
      subject_name_value
    from public.attendance_batch_subjects abs
    where
      abs.id =
        new.batch_subject_id;


    if subject_batch_id is null then
      raise exception
        'Selected assignment subject does not exist.';
    end if;


    if new.audience_batch_id is null
       or subject_batch_id <>
          new.audience_batch_id then

      raise exception
        'Assignment subject does not belong to the selected batch.';
    end if;


    /*
     * Keep subject as a display snapshot.
     * The UUID remains the authoritative identity.
     */
    new.subject :=
      subject_name_value;

  end if;


  /*
   * Faculty academic assignments must always use a real
   * assigned batch subject.
   */
  if public.current_campus_role() =
       'Faculty' then

    if new.batch_subject_id is null then
      raise exception
        'Faculty assignments must use an assigned subject.';
    end if;


    if not public.can_access_assigned_batch_subject(
      new.batch_subject_id
    ) then

      raise exception
        'You are not assigned to this batch subject.';
    end if;

  end if;


  return new;
end;
$$;


drop trigger if exists
validate_assignment_subject_scope_trigger
on public.assignments;


create trigger
validate_assignment_subject_scope_trigger
before insert or update
on public.assignments
for each row
execute function
public.validate_assignment_subject_scope();


-- ============================================================
-- 4. ASSIGNMENT INSERT POLICY
-- ============================================================

drop policy if exists
"Staff create assignments"
on public.assignments;


create policy
"Staff create assignments"
on public.assignments
for insert
to authenticated
with check (

  created_by = auth.uid()

  and audience_batch_id is not null

  and public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  )

  and (

    /*
     * Faculty must publish only to an actually assigned
     * batch + subject.
     */
    (
      public.current_campus_role() =
        'Faculty'

      and batch_subject_id is not null

      and exists (
        select 1
        from public.attendance_batch_subjects abs
        where
          abs.id =
            assignments.batch_subject_id

          and abs.batch_id =
            assignments.audience_batch_id

          and
            public.can_access_assigned_batch_subject(
              abs.id
            )
      )
    )

    or

    /*
     * Preserve existing non-Faculty staff workflows.
     */
    public.current_campus_role() in (
      'Coordinator',
      'Placement Cell',
      'Main Admin'
    )
  )
);


-- ============================================================
-- 5. ASSIGNMENT UPDATE POLICY
-- ============================================================

drop policy if exists
"Authors manage assignments"
on public.assignments;


create policy
"Authors manage assignments"
on public.assignments
for update
to authenticated
using (
  created_by = auth.uid()
)
with check (

  created_by = auth.uid()

  and (

    (
      public.current_campus_role() =
        'Faculty'

      and audience_batch_id is not null

      and batch_subject_id is not null

      and exists (
        select 1
        from public.attendance_batch_subjects abs
        where
          abs.id =
            assignments.batch_subject_id

          and abs.batch_id =
            assignments.audience_batch_id

          and
            public.can_access_assigned_batch_subject(
              abs.id
            )
      )
    )

    or

    public.current_campus_role() in (
      'Coordinator',
      'Placement Cell',
      'Main Admin'
    )
  )
);


-- ============================================================
-- 6. SECURE SUBMISSION READ ACCESS
--
-- Previously every Faculty account could read every student
-- submission in the database.
-- ============================================================

drop policy if exists
"Submission access"
on public.assignment_submissions;


create policy
"Submission access"
on public.assignment_submissions
for select
to authenticated
using (

  student_id = auth.uid()

  or public.current_campus_role() =
    'Main Admin'

  /*
   * Preserve existing Placement Cell visibility.
   */
  or public.current_campus_role() =
    'Placement Cell'

  /*
   * Faculty only sees submissions belonging to assignments
   * they actually created.
   */
  or (
    public.current_campus_role() =
      'Faculty'

    and exists (
      select 1
      from public.assignments a
      where
        a.id =
          assignment_submissions.assignment_id

        and a.created_by =
          auth.uid()
    )
  )
);


-- ============================================================
-- 7. STUDENT SUBMISSION INSERT SECURITY
--
-- A student should not be able to submit against an arbitrary
-- assignment UUID that was never assigned to their batch.
-- ============================================================

drop policy if exists
"Students submit their work"
on public.assignment_submissions;


create policy
"Students submit their work"
on public.assignment_submissions
for insert
to authenticated
with check (

  student_id = auth.uid()

  and public.current_campus_role() =
    'Student'

  and exists (
    select 1
    from public.assignments a
    where
      a.id =
        assignment_submissions.assignment_id

      and (

        (
          a.audience_batch_id is not null

          and exists (
            select 1
            from public.attendance_batch_students abs
            where
              abs.batch_id =
                a.audience_batch_id

              and abs.student_id =
                auth.uid()
          )
        )

        or

        (
          a.audience_batch_id is null

          and (
            a.audience_department =
              'All'

            or a.audience_department =
              public.current_campus_department()
          )
        )
      )
  )
);


drop policy if exists
"Students update their submission"
on public.assignment_submissions;


create policy
"Students update their submission"
on public.assignment_submissions
for update
to authenticated
using (
  student_id =
    auth.uid()
)
with check (

  student_id =
    auth.uid()

  and public.current_campus_role() =
    'Student'

  and exists (
    select 1
    from public.assignments a
    where
      a.id =
        assignment_submissions.assignment_id

      and (

        (
          a.audience_batch_id is not null

          and exists (
            select 1
            from public.attendance_batch_students abs
            where
              abs.batch_id =
                a.audience_batch_id

              and abs.student_id =
                auth.uid()
          )
        )

        or

        (
          a.audience_batch_id is null

          and (
            a.audience_department =
              'All'

            or a.audience_department =
              public.current_campus_department()
          )
        )
      )
  )
);


-- ============================================================
-- 8. UPDATE STUDENT ASSIGNMENT RPC
--
-- PostgreSQL cannot change the RETURNS TABLE shape with
-- CREATE OR REPLACE alone, therefore drop/recreate it.
-- ============================================================

drop function if exists
public.get_my_assignments();


create function public.get_my_assignments()
returns table (
  id uuid,
  title text,
  subject text,
  description text,
  due_at timestamptz,
  audience_department text,
  audience_batch_id uuid,
  batch_subject_id uuid,
  created_by uuid,
  created_by_name text,
  kind text,
  created_at timestamptz,
  batch_name text,
  batch_section text
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct
    a.id,
    a.title,
    a.subject,
    a.description,
    a.due_at,
    a.audience_department,
    a.audience_batch_id,
    a.batch_subject_id,
    a.created_by,
    a.created_by_name,
    a.kind,
    a.created_at,
    b.batch_name,
    b.section

  from public.assignments a

  left join public.attendance_batches b
    on b.id =
      a.audience_batch_id

  where
    auth.uid() is not null

    and (

      (
        a.audience_batch_id is not null

        and exists (
          select 1
          from public.attendance_batch_students abs
          where
            abs.batch_id =
              a.audience_batch_id

            and abs.student_id =
              auth.uid()
        )
      )

      or

      (
        a.audience_batch_id is null

        and (
          a.audience_department =
            'All'

          or a.audience_department =
            public.current_campus_department()
        )
      )
    )

  order by
    a.due_at asc;
$$;


revoke all
on function public.get_my_assignments()
from public, anon;


grant execute
on function public.get_my_assignments()
to authenticated;


notify pgrst, 'reload schema';
