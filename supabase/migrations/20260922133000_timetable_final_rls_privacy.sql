-- ============================================================
-- CAMPUSCONNECT TIMETABLE V2
-- FINAL RLS PRIVACY HARDENING
--
-- Student:
--   Own batch + Published timetable only.
--
-- Faculty:
--   Own teaching data only.
--   Publication metadata only for batches they teach.
--
-- Coordinator:
--   Publication metadata only for assigned department batches.
--
-- Main Admin:
--   Read-only timetable visibility remains available.
--
-- Direct timetable/publication mutation is disabled for normal
-- authenticated clients. All mutations go through audited
-- SECURITY DEFINER RPCs.
-- ============================================================


-- ============================================================
-- 1. DEFENSE IN DEPTH — DIRECT DML IS NOT REQUIRED
-- ============================================================

revoke
  insert,
  update,
  delete
on table
public.batch_timetable_entries
from authenticated;


revoke
  insert,
  update,
  delete
on table
public.timetable_publications
from authenticated;


grant select
on table
public.batch_timetable_entries
to authenticated;


grant select
on table
public.timetable_publications
to authenticated;



-- ============================================================
-- 2. FACULTY BATCH-ACCESS HELPER
--
-- SECURITY DEFINER prevents unrelated helper-table RLS from
-- changing the meaning of timetable publication privacy.
-- ============================================================

create or replace function
public.can_current_faculty_access_timetable_batch(
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
      'Faculty'

    and (

      exists (

        select
          1

        from
          public.attendance_batch_subjects subject

        where
          subject.batch_id =
            p_batch_id

          and subject.faculty_id =
            auth.uid()
      )

      or exists (

        select
          1

        from
          public.faculty_teaching_allocations allocation

        where
          allocation.batch_id =
            p_batch_id

          and allocation.faculty_id =
            auth.uid()

          and allocation.status =
            'Active'
      )
    );

$$;


revoke all
on function
public.can_current_faculty_access_timetable_batch(
  uuid
)
from public, anon;


grant execute
on function
public.can_current_faculty_access_timetable_batch(
  uuid
)
to authenticated;



-- ============================================================
-- 3. STUDENT DIRECT TIMETABLE READ
--
-- Critical change:
--
-- Old policy:
--   Student membership in batch
--
-- New policy:
--   Student role
--   + membership in batch
--   + publication exists
--   + publication status = Published
--
-- Draft and Superseded rows are therefore invisible to Student
-- direct PostgREST queries.
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

  public.current_campus_role() =
    'Student'

  and exists (

    select
      1

    from
      public.attendance_batch_students membership

    where
      membership.batch_id =
        batch_timetable_entries.batch_id

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
        batch_timetable_entries.publication_id

      and publication.batch_id =
        batch_timetable_entries.batch_id

      and publication.status =
        'Published'
  )
);



-- ============================================================
-- 4. TIMETABLE PUBLICATION METADATA PRIVACY
-- ============================================================

drop policy if exists
"Authenticated reads timetable publications"
on public.timetable_publications;


drop policy if exists
"Students read own published timetable publications"
on public.timetable_publications;


drop policy if exists
"Faculty reads assigned published timetable publications"
on public.timetable_publications;


drop policy if exists
"Timetable Coordinator reads assigned timetable publications"
on public.timetable_publications;


drop policy if exists
"Main Admin reads timetable publications"
on public.timetable_publications;


-- ------------------------------------------------------------
-- STUDENT
-- ------------------------------------------------------------

create policy
"Students read own published timetable publications"
on public.timetable_publications
for select
to authenticated
using (

  public.current_campus_role() =
    'Student'

  and status =
    'Published'

  and exists (

    select
      1

    from
      public.attendance_batch_students membership

    where
      membership.batch_id =
        timetable_publications.batch_id

      and membership.student_id =
        auth.uid()
  )
);


-- ------------------------------------------------------------
-- FACULTY
-- ------------------------------------------------------------

create policy
"Faculty reads assigned published timetable publications"
on public.timetable_publications
for select
to authenticated
using (

  status =
    'Published'

  and
    public.can_current_faculty_access_timetable_batch(
      timetable_publications.batch_id
    )
);


-- ------------------------------------------------------------
-- TIMETABLE COORDINATOR
--
-- Draft/Superseded/Published metadata is required for batches
-- inside the Coordinator's active department assignment.
-- ------------------------------------------------------------

create policy
"Timetable Coordinator reads assigned timetable publications"
on public.timetable_publications
for select
to authenticated
using (

  public.current_campus_role() =
    'Coordinator'

  and
    public.is_timetable_coordinator_for_batch(
      timetable_publications.batch_id
    )
);


-- ------------------------------------------------------------
-- MAIN ADMIN
--
-- Read-only visibility remains available for oversight.
-- Timetable mutation remains Coordinator RPC-only.
-- ------------------------------------------------------------

create policy
"Main Admin reads timetable publications"
on public.timetable_publications
for select
to authenticated
using (

  public.current_campus_role() =
    'Main Admin'
);



comment on function
public.can_current_faculty_access_timetable_batch(
  uuid
)
is
'Returns true only when the authenticated Faculty member has a direct subject or active teaching allocation in the selected batch.';


notify pgrst,
  'reload schema';
