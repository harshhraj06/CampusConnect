-- ============================================================
-- CAMPUSCONNECT — TIMETABLE V2 CUTOVER HARDENING
--
-- Final authority model:
--
-- Main Admin:
--   • assigns Timetable Coordinators
--   • maintains scheduling configuration
--   • cannot directly publish/edit timetable entries
--
-- Timetable Coordinator:
--   • builds, validates and publishes department timetable
--     exclusively through audited SECURITY DEFINER RPCs
--
-- Faculty:
--   • sees only own Published timetable entries
--   • cannot directly create/update/delete timetable
--   • submits change requests instead
--
-- Student:
--   • sees own Published batch timetable
--   • receives real configured Period/Break grid slots
-- ============================================================


-- ============================================================
-- 1. RETIRE LEGACY MAIN ADMIN PUBLISH ENDPOINT
-- ============================================================

revoke execute
on function
public.publish_generated_timetable(
  uuid,
  jsonb
)
from authenticated;


-- ============================================================
-- 2. REMOVE DIRECT FACULTY TIMETABLE MUTATION
-- ============================================================

drop policy if exists
"Faculty creates assigned timetable"
on public.batch_timetable_entries;


drop policy if exists
"Faculty updates assigned timetable"
on public.batch_timetable_entries;


drop policy if exists
"Faculty deletes assigned timetable"
on public.batch_timetable_entries;


-- ============================================================
-- 3. REMOVE DIRECT MAIN ADMIN TIMETABLE MUTATION
--
-- Main Admin remains configuration/assignment authority.
-- Digital timetable content belongs to assigned Coordinator.
-- ============================================================

drop policy if exists
"Main Admin creates timetable"
on public.batch_timetable_entries;


drop policy if exists
"Main Admin updates timetable"
on public.batch_timetable_entries;


drop policy if exists
"Main Admin deletes timetable"
on public.batch_timetable_entries;


-- Main Admin must not directly mutate publication states either.

drop policy if exists
"Main Admin manages timetable publications"
on public.timetable_publications;


-- ============================================================
-- 4. FACULTY DIRECT READ = OWN PUBLISHED CLASSES ONLY
-- ============================================================

drop policy if exists
"Faculty read assigned timetable"
on public.batch_timetable_entries;


drop policy if exists
"Faculty read assigned batch timetable"
on public.batch_timetable_entries;


drop policy if exists
"Faculty reads own published timetable"
on public.batch_timetable_entries;


create policy
"Faculty reads own published timetable"
on public.batch_timetable_entries
for select
to authenticated
using (

  public.current_campus_role() =
    'Faculty'

  and faculty_id =
    auth.uid()

  and exists (

    select
      1

    from
      public.timetable_publications publication

    where
      publication.id =
        batch_timetable_entries.publication_id

      and publication.status =
        'Published'
  )
);


-- ============================================================
-- 5. FACULTY MAY NOT MODIFY LEGACY BATCH BREAKS
--
-- Break/Lunch structure is timetable configuration, not a
-- Faculty-owned timetable record.
-- ============================================================

drop policy if exists
"Faculty creates timetable breaks"
on public.batch_timetable_breaks;


drop policy if exists
"Faculty updates timetable breaks"
on public.batch_timetable_breaks;


drop policy if exists
"Faculty deletes timetable breaks"
on public.batch_timetable_breaks;


-- ============================================================
-- 6. STUDENT DIGITAL GRID SLOT RPC
--
-- This makes Period 1 / Period 2 / Break / Period 3 etc.
-- come from the real timetable profile rather than only from
-- currently occupied class rows.
--
-- Therefore a completely empty period is still visible.
-- ============================================================

create or replace function
public.get_my_timetable_grid_slots()
returns table (

  id uuid,

  batch_id uuid,

  period_order integer,

  label text,

  start_time time,

  end_time time,

  is_teaching_slot boolean

)
language sql
stable
security definer
set search_path = ''
as $$

  select distinct

    slot.id,

    membership.batch_id,

    slot.period_order,

    slot.label,

    slot.start_time,

    slot.end_time,

    slot.is_teaching_slot

  from
    public.attendance_batch_students membership

  join
    public.timetable_batch_profiles mapping

      on mapping.batch_id =
        membership.batch_id

  join
    public.timetable_period_slots slot

      on slot.profile_id =
        mapping.profile_id

  where
    membership.student_id =
      auth.uid()

    and public.current_campus_role() =
      'Student'

  order by
    membership.batch_id,
    slot.period_order;

$$;


revoke all
on function
public.get_my_timetable_grid_slots()
from public, anon;


grant execute
on function
public.get_my_timetable_grid_slots()
to authenticated;


comment on function
public.get_my_timetable_grid_slots()
is
'Returns the authenticated Student timetable profile slots, including empty teaching periods and Break/Lunch slots, for digital grid rendering.';


-- ============================================================
-- 7. FORWARD REPLACEMENTS FOLLOW
-- ============================================================


-- ============================================================
-- 8. CHANGE REQUEST REBUILD — MULTI-PERIOD + LOCK HARDENING
-- ============================================================

create or replace function
public.apply_timetable_change_request(

  p_request_id uuid,

  p_option_id uuid,

  p_note text
    default ''

)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_request
    public.timetable_change_requests%rowtype;

  v_option
    public.timetable_change_request_options%rowtype;

  v_current_publication
    public.timetable_publications%rowtype;

  v_original
    public.batch_timetable_entries%rowtype;

  v_slot
    public.timetable_period_slots%rowtype;

  v_new_publication_id uuid;

  v_next_version integer;

  v_entry_count integer;

  v_note text;

  v_original_subgroup text;

begin


  -- Serialize every timetable publication/rebuild path.
  perform
    pg_catalog.pg_advisory_xact_lock(
      20260919122000
    );


  -- ----------------------------------------------------------
  -- Authentication / role
  -- ----------------------------------------------------------

  if
    auth.uid() is null
  then
    raise exception
      'Authentication required.';
  end if;


  if
    public.current_campus_role() <>
      'Coordinator'
  then
    raise exception
      'Timetable Coordinator permission required.';
  end if;


  v_note :=
    btrim(
      coalesce(
        p_note,
        ''
      )
    );


  if
    char_length(
      v_note
    ) > 2000
  then
    raise exception
      'Coordinator note cannot exceed 2000 characters.';
  end if;


  -- ----------------------------------------------------------
  -- Lock request
  -- ----------------------------------------------------------

  select
    request.*

  into
    v_request

  from
    public.timetable_change_requests request

  where
    request.id =
      p_request_id

  for update;


  if
    v_request.id is null
  then
    raise exception
      'Timetable change request not found.';
  end if;


  if not
    public.is_timetable_coordinator_for_department(
      v_request.department
    )
  then
    raise exception
      'This request is outside your assigned timetable department.';
  end if;


  if
    v_request.status not in (
      'Pending',
      'Reviewing'
    )
  then
    raise exception
      'Only an open timetable request can be rebuilt.';
  end if;


  -- ----------------------------------------------------------
  -- Chosen Faculty alternative
  -- ----------------------------------------------------------

  select
    option.*

  into
    v_option

  from
    public.timetable_change_request_options option

  where
    option.id =
      p_option_id

    and option.request_id =
      v_request.id;


  if
    v_option.id is null
  then
    raise exception
      'Select one of the Faculty-provided alternative times.';
  end if;


  if
    v_option.period_slot_id is null
  then
    raise exception
      'The selected period no longer exists. Ask the Faculty member to submit a new request.';
  end if;


  -- ----------------------------------------------------------
  -- Current publication for affected batch
  -- ----------------------------------------------------------

  select
    publication.*

  into
    v_current_publication

  from
    public.timetable_publications publication

  where
    publication.batch_id =
      v_request.batch_id

    and publication.status =
      'Published'

  order by
    publication.version_number desc

  limit 1

  for update;


  if
    v_current_publication.id is null
  then
    raise exception
      'This batch has no current Published timetable.';
  end if;


  -- Request must still refer to the version currently visible
  -- to students/faculty.

  if
    v_request.publication_id is distinct from
      v_current_publication.id
  then
    raise exception
      'This request belongs to an older timetable version. Ask the Faculty member to review the latest timetable and submit a new request if required.';
  end if;


  -- ----------------------------------------------------------
  -- Original timetable entry
  -- ----------------------------------------------------------

  select
    entry.*

  into
    v_original

  from
    public.batch_timetable_entries entry

  where
    entry.id =
      v_request.timetable_entry_id

    and entry.publication_id =
      v_current_publication.id

    and entry.batch_id =
      v_request.batch_id

  for update;


  if
    v_original.id is null
  then
    raise exception
      'The original class no longer exists in the current Published timetable.';
  end if;


  v_original_subgroup :=
    upper(
      btrim(
        coalesce(
          v_original.subgroup,
          ''
        )
      )
    );


  -- ----------------------------------------------------------
  -- Prevent accidental splitting of a multi-period session.
  --
  -- Same subject/faculty/subgroup on an immediately adjacent
  -- period is treated as one teaching session.
  -- ----------------------------------------------------------


  /*
   * Multi-period safety:
   *
   * Do not depend on exact end_time = next start_time.
   * Real college timetables may contain a one-minute or other
   * configured gap between logically consecutive periods.
   *
   * Also do not treat two independent back-to-back lectures
   * as one lab merely because subject + faculty are identical.
   * A session is considered multi-period when the allocation
   * explicitly requires >1 period, or the class is a
   * Lab/Practical.
   */
  if
    (
      exists (

        select
          1

        from
          public.faculty_teaching_allocations allocation

        where
          allocation.batch_id =
            v_original.batch_id

          and allocation.batch_subject_id =
            v_original.batch_subject_id

          and allocation.faculty_id =
            v_original.faculty_id

          and allocation.status =
            'Active'

          and coalesce(
            allocation.session_length_periods,
            1
          ) > 1

          and (

            btrim(
              coalesce(
                allocation.subgroup,
                ''
              )
            ) = ''

            or upper(
              btrim(
                coalesce(
                  allocation.subgroup,
                  ''
                )
              )
            ) =
            v_original_subgroup
          )
      )

      or lower(
        btrim(
          coalesce(
            v_original.class_type,
            ''
          )
        )
      ) in (
        'lab',
        'laboratory',
        'practical'
      )
    )

    and exists (

      select
        1

      from
        public.batch_timetable_entries adjacent

      where
        adjacent.publication_id =
          v_current_publication.id

        and adjacent.id <>
          v_original.id

        and adjacent.batch_id =
          v_original.batch_id

        and adjacent.batch_subject_id =
          v_original.batch_subject_id

        and adjacent.faculty_id =
          v_original.faculty_id

        and adjacent.day_of_week =
          v_original.day_of_week

        and upper(
          btrim(
            coalesce(
              adjacent.subgroup,
              ''
            )
          )
        ) =
        v_original_subgroup

        and adjacent.period_order in (
          v_original.period_order - 1,
          v_original.period_order + 1
        )
    )

  then

    raise exception
      'This class is part of a consecutive multi-period session. Use the full timetable builder so the complete session moves together.';

  end if;


  -- ----------------------------------------------------------
  -- Revalidate actual period slot.
  --
  -- If Main Admin changed timetable period configuration after
  -- Faculty submitted the request, do not silently reinterpret
  -- their selected time.
  -- ----------------------------------------------------------

  select
    slot.*

  into
    v_slot

  from
    public.timetable_period_slots slot

  where
    slot.id =
      v_option.period_slot_id

    and slot.is_teaching_slot

    and slot.period_order =
      v_option.period_order

    and slot.start_time =
      v_option.start_time

    and slot.end_time =
      v_option.end_time;


  if
    v_slot.id is null
  then
    raise exception
      'The selected timetable period changed after this request was submitted. Ask the Faculty member to submit a new request.';
  end if;


  -- Slot must still belong to this batch profile.

  if not exists (

    select
      1

    from
      public.timetable_batch_profiles mapping

    where
      mapping.batch_id =
        v_request.batch_id

      and mapping.profile_id =
        v_slot.profile_id

  )
  then
    raise exception
      'The selected period is no longer part of this batch schedule.';
  end if;


  -- Day must still be active.

  if not exists (

    select
      1

    from
      public.timetable_working_days working_day

    where
      working_day.profile_id =
        v_slot.profile_id

      and working_day.day_of_week =
        v_option.day_of_week

      and working_day.is_working_day

  )
  then
    raise exception
      'The selected alternative day is no longer an active working day.';
  end if;


  -- ----------------------------------------------------------
  -- FACULTY COLLISION
  --
  -- Check current Published timetables belonging to OTHER
  -- batches. The affected batch itself is rebuilt below.
  -- ----------------------------------------------------------

  if exists (

    select
      1

    from
      public.batch_timetable_entries existing

    join
      public.timetable_publications publication
        on publication.id =
          existing.publication_id

    where
      existing.faculty_id =
        v_original.faculty_id

      and existing.batch_id <>
        v_original.batch_id

      and publication.status =
        'Published'

      and existing.day_of_week =
        v_option.day_of_week

      and v_slot.start_time <
        existing.end_time

      and v_slot.end_time >
        existing.start_time

  )
  then
    raise exception
      'Faculty conflict: the teacher already has another Published class during this time.';
  end if;


  -- ----------------------------------------------------------
  -- BATCH / SUBGROUP COLLISION INSIDE CURRENT BATCH
  --
  -- Whole-batch classes conflict with everything.
  -- Subgroup classes may coexist only with DIFFERENT subgroups.
  -- ----------------------------------------------------------

  if exists (

    select
      1

    from
      public.batch_timetable_entries existing

    where
      existing.publication_id =
        v_current_publication.id

      and existing.id <>
        v_original.id

      and existing.day_of_week =
        v_option.day_of_week

      and v_slot.start_time <
        existing.end_time

      and v_slot.end_time >
        existing.start_time

      and (

        v_original_subgroup =
          ''

        or

        upper(
          btrim(
            coalesce(
              existing.subgroup,
              ''
            )
          )
        ) =
          ''

        or

        upper(
          btrim(
            coalesce(
              existing.subgroup,
              ''
            )
          )
        ) =
          v_original_subgroup

      )

  )
  then
    raise exception
      'Batch conflict: this batch or subgroup already has another class during the selected time.';
  end if;


  -- ----------------------------------------------------------
  -- RESOURCE COLLISION
  --
  -- Preserve the original room/lab for this move.
  -- ----------------------------------------------------------

  if
    v_original.resource_id is not null

    and exists (

      select
        1

      from
        public.batch_timetable_entries existing

      join
        public.timetable_publications publication
          on publication.id =
            existing.publication_id

      where
        existing.resource_id =
          v_original.resource_id

        and existing.batch_id <>
          v_original.batch_id

        and publication.status =
          'Published'

        and existing.day_of_week =
          v_option.day_of_week

        and v_slot.start_time <
          existing.end_time

        and v_slot.end_time >
          existing.start_time

    )
  then
    raise exception
      'Room or laboratory conflict: the assigned resource is already occupied during this time.';
  end if;


  -- Same resource cannot collide with another subgroup/session
  -- inside the affected batch either.

  if
    v_original.resource_id is not null

    and exists (

      select
        1

      from
        public.batch_timetable_entries existing

      where
        existing.publication_id =
          v_current_publication.id

        and existing.id <>
          v_original.id

        and existing.resource_id =
          v_original.resource_id

        and existing.day_of_week =
          v_option.day_of_week

        and v_slot.start_time <
          existing.end_time

        and v_slot.end_time >
          existing.start_time

    )
  then
    raise exception
      'Room or laboratory conflict: the assigned resource is already used by this batch during the selected time.';
  end if;


  -- Legacy rows may contain a room string without resource_id.
  -- Protect those too when a meaningful room name exists.

  if
    v_original.resource_id is null

    and btrim(
      coalesce(
        v_original.room,
        ''
      )
    ) <>
      ''

    and exists (

      select
        1

      from
        public.batch_timetable_entries existing

      join
        public.timetable_publications publication
          on publication.id =
            existing.publication_id

      where
        existing.id <>
          v_original.id

        and lower(
          btrim(
            coalesce(
              existing.room,
              ''
            )
          )
        ) =
        lower(
          btrim(
            v_original.room
          )
        )

        and publication.status =
          'Published'

        and existing.batch_id <>
          v_original.batch_id

        and existing.day_of_week =
          v_option.day_of_week

        and v_slot.start_time <
          existing.end_time

        and v_slot.end_time >
          existing.start_time

    )
  then
    raise exception
      'Room conflict: the assigned room name is already used during this time.';
  end if;


  -- ----------------------------------------------------------
  -- Legacy named-room collision inside affected batch
  --
  -- Different non-empty subgroups may legitimately run in
  -- parallel, but they still cannot occupy the same physical
  -- room when that room exists only as legacy text and has no
  -- timetable_resources UUID.
  -- ----------------------------------------------------------

  if
    v_original.resource_id is null

    and btrim(
      coalesce(
        v_original.room,
        ''
      )
    ) <>
      ''

    and exists (

      select
        1

      from
        public.batch_timetable_entries existing

      where
        existing.publication_id =
          v_current_publication.id

        and existing.id <>
          v_original.id

        and existing.resource_id is null

        and lower(
          btrim(
            coalesce(
              existing.room,
              ''
            )
          )
        ) =
        lower(
          btrim(
            v_original.room
          )
        )

        and existing.day_of_week =
          v_option.day_of_week

        and v_slot.start_time <
          existing.end_time

        and v_slot.end_time >
          existing.start_time

    )
  then
    raise exception
      'Room conflict: another class in this batch already uses the assigned room during this time.';
  end if;


  -- ----------------------------------------------------------
  -- Version number
  -- ----------------------------------------------------------

  select
    coalesce(
      max(
        publication.version_number
      ),
      0
    ) + 1

  into
    v_next_version

  from
    public.timetable_publications publication

  where
    publication.batch_id =
      v_request.batch_id;


  -- ----------------------------------------------------------
  -- Create new DRAFT publication
  -- ----------------------------------------------------------

  insert into
  public.timetable_publications (

    batch_id,

    version_number,

    status,

    created_by

  )
  values (

    v_request.batch_id,

    v_next_version,

    'Draft',

    auth.uid()

  )
  returning
    id

  into
    v_new_publication_id;


  -- ----------------------------------------------------------
  -- Clone every unaffected entry
  -- ----------------------------------------------------------

  insert into
  public.batch_timetable_entries (

    batch_id,

    batch_subject_id,

    faculty_id,

    faculty_name,

    day_of_week,

    period_order,

    start_time,

    end_time,

    room,

    class_type,

    notes,

    created_by,

    subgroup,

    resource_id,

    publication_id

  )

  select

    entry.batch_id,

    entry.batch_subject_id,

    entry.faculty_id,

    entry.faculty_name,

    entry.day_of_week,

    entry.period_order,

    entry.start_time,

    entry.end_time,

    entry.room,

    entry.class_type,

    entry.notes,

    auth.uid(),

    entry.subgroup,

    entry.resource_id,

    v_new_publication_id

  from
    public.batch_timetable_entries entry

  where
    entry.publication_id =
      v_current_publication.id

    and entry.id <>
      v_original.id;


  -- ----------------------------------------------------------
  -- Insert moved replacement class
  -- ----------------------------------------------------------

  insert into
  public.batch_timetable_entries (

    batch_id,

    batch_subject_id,

    faculty_id,

    faculty_name,

    day_of_week,

    period_order,

    start_time,

    end_time,

    room,

    class_type,

    notes,

    created_by,

    subgroup,

    resource_id,

    publication_id

  )
  values (

    v_original.batch_id,

    v_original.batch_subject_id,

    v_original.faculty_id,

    v_original.faculty_name,

    v_option.day_of_week,

    v_slot.period_order,

    v_slot.start_time,

    v_slot.end_time,

    v_original.room,

    v_original.class_type,

    v_original.notes,

    auth.uid(),

    v_original.subgroup,

    v_original.resource_id,

    v_new_publication_id

  );


  -- ----------------------------------------------------------
  -- Defensive count: new version must contain exactly the same
  -- number of periods as the previous version.
  -- ----------------------------------------------------------

  select
    count(*)

  into
    v_entry_count

  from
    public.batch_timetable_entries entry

  where
    entry.publication_id =
      v_new_publication_id;


  if
    v_entry_count <>
    (
      select
        count(*)

      from
        public.batch_timetable_entries entry

      where
        entry.publication_id =
          v_current_publication.id
    )
  then
    raise exception
      'Timetable rebuild failed validation: period count changed unexpectedly.';
  end if;


  -- ----------------------------------------------------------
  -- Atomic publication cutover
  -- ----------------------------------------------------------

  update
    public.timetable_publications

  set
    status =
      'Superseded',

    updated_at =
      now()

  where
    id =
      v_current_publication.id;


  update
    public.timetable_publications

  set
    status =
      'Published',

    published_by =
      auth.uid(),

    published_at =
      now(),

    updated_at =
      now()

  where
    id =
      v_new_publication_id;


  -- ----------------------------------------------------------
  -- Resolve selected request
  -- ----------------------------------------------------------

  update
    public.timetable_change_requests

  set
    status =
      'Rebuilt',

    coordinator_id =
      auth.uid(),

    coordinator_note =
      v_note,

    resolution_publication_id =
      v_new_publication_id,

    resolved_at =
      now(),

    updated_at =
      now()

  where
    id =
      v_request.id;


  -- ----------------------------------------------------------
  -- Other requests based on the now-superseded version are
  -- stale. Close them safely and ask Faculty to review the new
  -- timetable before resubmitting.
  -- ----------------------------------------------------------

  update
    public.timetable_change_requests

  set
    status =
      'Cancelled',

    coordinator_id =
      auth.uid(),

    coordinator_note =
      case

        when
          btrim(
            coalesce(
              coordinator_note,
              ''
            )
          ) =
            ''
        then
          'A newer timetable version was published for this batch. Review the latest timetable and submit a new request if the conflict still exists.'

        else
          coordinator_note ||
          E'\n\n' ||
          'A newer timetable version was published for this batch. Review the latest timetable and submit a new request if the conflict still exists.'

      end,

    resolved_at =
      now(),

    updated_at =
      now()

  where
    batch_id =
      v_request.batch_id

    and publication_id =
      v_current_publication.id

    and id <>
      v_request.id

    and status in (
      'Pending',
      'Reviewing'
    );


  return
    jsonb_build_object(

      'publicationId',
        v_new_publication_id,

      'versionNumber',
        v_next_version,

      'entryCount',
        v_entry_count,

      'requestId',
        v_request.id,

      'status',
        'Rebuilt',

      'movedClass',

        jsonb_build_object(

          'dayOfWeek',
            v_option.day_of_week,

          'periodOrder',
            v_slot.period_order,

          'startTime',
            v_slot.start_time,

          'endTime',
            v_slot.end_time,

          'room',
            v_original.room

        )

    );

end;
$$;

-- ============================================================
-- 9. FACULTY BATCH TIMETABLE RPC — OWN CLASSES ONLY
-- ============================================================

create or replace function
public.get_current_batch_timetable_entries(
  p_batch_ids uuid[]
)
returns table (
  id uuid,
  batch_id uuid,
  batch_subject_id uuid,
  faculty_id uuid,
  faculty_name text,
  day_of_week text,
  period_order integer,
  start_time time,
  end_time time,
  room text,
  class_type text,
  subgroup text,
  resource_id uuid,
  publication_id uuid
)
language sql
stable
security definer
set search_path = ''
as $function$

  select
    entry.id,
    entry.batch_id,
    entry.batch_subject_id,
    entry.faculty_id,
    entry.faculty_name,
    entry.day_of_week,
    entry.period_order,
    entry.start_time,
    entry.end_time,
    entry.room,
    entry.class_type,
    entry.subgroup,
    entry.resource_id,
    entry.publication_id

  from
    public.batch_timetable_entries entry

  join
    public.timetable_publications publication
    on publication.id =
      entry.publication_id

  where
    auth.uid() is not null

    and entry.batch_id =
      any(
        coalesce(
          p_batch_ids,
          array[]::uuid[]
        )
      )

    and publication.status =
      'Published'


    and (
      public.current_campus_role() =
        'Main Admin'

      or (
        public.current_campus_role() =
          'Faculty'

        and entry.faculty_id =
          auth.uid()
      )
    )

  order by
    entry.day_of_week,
    entry.period_order,
    entry.start_time;

$function$;

-- ============================================================
-- 10. SCHEMA RELOAD
-- ============================================================


-- ============================================================
-- TIMETABLE LEGACY DOCUMENT ARCHIVE CUTOVER
--
-- Preserve old uploaded timetable files for audit/history,
-- but remove them from active timetable workflows.
--
-- Main Admin: READ-ONLY archive access
-- Faculty: no document access
-- Students: no document access
-- Coordinator: uses Digital Builder, not legacy files
-- ============================================================


-- ------------------------------------------------------------
-- TABLE POLICIES
-- Remove every existing timetable-document policy, regardless
-- of which historical migration created it.
-- ------------------------------------------------------------

do $$
declare
  policy_row record;
begin

  for policy_row in

    select
      policyname

    from
      pg_catalog.pg_policies

    where
      schemaname =
        'public'

      and tablename =
        'batch_timetable_documents'

  loop

    execute format(
      'drop policy if exists %I on public.batch_timetable_documents',
      policy_row.policyname
    );

  end loop;

end;
$$;


revoke
  insert,
  update,
  delete
on table
public.batch_timetable_documents
from authenticated;


grant select
on table
public.batch_timetable_documents
to authenticated;


create policy
"Main Admin reads legacy timetable archive"
on public.batch_timetable_documents
for select
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
);


-- ------------------------------------------------------------
-- STORAGE POLICIES
--
-- Remove only policies referring to the campus-timetables
-- bucket. Other storage buckets are untouched.
-- ------------------------------------------------------------

do $$
declare
  policy_row record;
begin

  for policy_row in

    select
      policyname

    from
      pg_catalog.pg_policies

    where
      schemaname =
        'storage'

      and tablename =
        'objects'

      and (
        coalesce(
          qual,
          ''
        ) ilike
          '%campus-timetables%'

        or coalesce(
          with_check,
          ''
        ) ilike
          '%campus-timetables%'
      )

  loop

    execute format(
      'drop policy if exists %I on storage.objects',
      policy_row.policyname
    );

  end loop;

end;
$$;


create policy
"Main Admin reads legacy timetable archive files"
on storage.objects
for select
to authenticated
using (

  bucket_id =
    'campus-timetables'

  and public.current_campus_role() =
    'Main Admin'
);


-- Existing archive rows/files are intentionally NOT deleted.


notify pgrst,
  'reload schema';
