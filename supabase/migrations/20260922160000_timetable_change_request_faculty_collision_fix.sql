-- ============================================================
-- CAMPUSCONNECT TIMETABLE V2
-- FACULTY COLLISION REVALIDATION FIX
--
-- Forward-only correction.
--
-- Explicit session identity continues to prevent splitting a
-- true multi-period teaching session.
--
-- Cross-batch Faculty collision validation now executes as an
-- independent validation step for explicit single-period
-- sessions as well as legacy entries.
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

  if
    v_original.session_group_id
      is not null
  then

    if exists (

      select
        1

      from
        public.batch_timetable_entries grouped_entry

      where
        grouped_entry.publication_id =
          v_current_publication.id

        and grouped_entry.session_group_id =
          v_original.session_group_id

        and grouped_entry.id <>
          v_original.id

    )
    then

      raise exception
        'This class is part of a consecutive multi-period session. Use the full timetable builder so the complete session moves together.';

    end if;

  end if;


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

    session_group_id,

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

    entry.session_group_id,

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

    session_group_id,

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

    v_original.session_group_id,

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

revoke all
on function
public.apply_timetable_change_request(
  uuid,
  uuid,
  text
)
from public, anon;


grant execute
on function
public.apply_timetable_change_request(
  uuid,
  uuid,
  text
)
to authenticated;


comment on function
public.apply_timetable_change_request(
  uuid,
  uuid,
  text
)
is
'Atomically rebuilds a Faculty-requested single-period timetable move. Multi-period session identity, Faculty collisions, batch/subgroup collisions, and room/resource collisions are independently validated before publication.';


notify pgrst,
  'reload schema';
