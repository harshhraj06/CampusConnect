-- ============================================================
-- CAMPUSCONNECT TIMETABLE V2
-- STUDENT RLS MEMBERSHIP BRIDGE
--
-- Problem:
-- Student timetable/publication RLS depended directly on
-- attendance_batch_students.
--
-- That roster table intentionally does not expose rows directly
-- to Students after academic-access hardening.
--
-- Solution:
-- Keep roster privacy intact and expose only narrow boolean
-- SECURITY DEFINER helpers for timetable authorization.
-- ============================================================


-- ============================================================
-- 1. STUDENT BATCH MEMBERSHIP HELPER
-- ============================================================

create or replace function
public.is_current_student_in_batch(
  p_batch_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$

  select

    auth.uid() is not null

    and public.current_campus_role() =
      'Student'

    and exists (

      select
        1

      from
        public.attendance_batch_students membership

      where
        membership.batch_id =
          p_batch_id

        and membership.student_id =
          auth.uid()
    );

$$;


revoke all
on function
public.is_current_student_in_batch(
  uuid
)
from public, anon;


grant execute
on function
public.is_current_student_in_batch(
  uuid
)
to authenticated;


comment on function
public.is_current_student_in_batch(
  uuid
)
is
'Returns only whether the authenticated Student belongs to the specified attendance batch. Does not expose roster rows.';



-- ============================================================
-- 2. PUBLISHED TIMETABLE ENTRY AUTHORIZATION HELPER
-- ============================================================

create or replace function
public.can_current_student_read_timetable_entry(
  p_batch_id uuid,
  p_publication_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$

  select

    auth.uid() is not null

    and public.current_campus_role() =
      'Student'

    and exists (

      select
        1

      from
        public.attendance_batch_students membership

      where
        membership.batch_id =
          p_batch_id

        and membership.student_id =
          auth.uid()
    )

    and exists (

      select
        1

      from
        public.timetable_publications publication

      where
        publication.id =
          p_publication_id

        and publication.batch_id =
          p_batch_id

        and publication.status =
          'Published'
    );

$$;


revoke all
on function
public.can_current_student_read_timetable_entry(
  uuid,
  uuid
)
from public, anon;


grant execute
on function
public.can_current_student_read_timetable_entry(
  uuid,
  uuid
)
to authenticated;


comment on function
public.can_current_student_read_timetable_entry(
  uuid,
  uuid
)
is
'Authorizes Student direct timetable-entry SELECT only when the caller belongs to the batch and the referenced timetable publication is Published.';



-- ============================================================
-- 3. REPAIR STUDENT TIMETABLE ENTRY RLS
-- ============================================================

drop policy if exists
"Students read own batch timetable"
on public.batch_timetable_entries;


drop policy if exists
"Students read own published batch timetable"
on public.batch_timetable_entries;


create policy
"Students read own published batch timetable"
on public.batch_timetable_entries
for select
to authenticated
using (

  public.can_current_student_read_timetable_entry(
    batch_timetable_entries.batch_id,
    batch_timetable_entries.publication_id
  )
);



-- ============================================================
-- 4. REPAIR STUDENT PUBLICATION METADATA RLS
-- ============================================================

drop policy if exists
"Students read own published timetable publications"
on public.timetable_publications;


create policy
"Students read own published timetable publications"
on public.timetable_publications
for select
to authenticated
using (

  timetable_publications.status =
    'Published'

  and public.is_current_student_in_batch(
    timetable_publications.batch_id
  )
);



-- ============================================================
-- 5. IMPORTANT
--
-- We intentionally DO NOT create a Student SELECT policy on
-- attendance_batch_students.
--
-- Students receive only a boolean membership decision, never
-- direct batch-roster visibility.
-- ============================================================

notify pgrst,
  'reload schema';
