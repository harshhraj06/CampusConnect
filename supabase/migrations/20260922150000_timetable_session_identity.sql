-- ============================================================
-- CAMPUSCONNECT TIMETABLE V2
-- EXPLICIT SESSION IDENTITY
--
-- New Builder sessions receive one session_group_id UUID shared
-- by every period row belonging to that logical session.
--
-- Legacy rows remain NULL intentionally. They keep the previous
-- adjacency fallback until they are rebuilt/edited by Builder.
--
-- This is a FORWARD migration. Previously applied migrations
-- are not edited.
-- ============================================================


alter table
public.batch_timetable_entries
add column if not exists
session_group_id uuid;


create index if not exists
batch_timetable_session_group_idx
on public.batch_timetable_entries (
  publication_id,
  session_group_id
)
where session_group_id
  is not null;


comment on column
public.batch_timetable_entries.session_group_id
is
'Stable logical teaching-session identity. All periods belonging to one newly created Builder session share this UUID. NULL identifies legacy rows created before explicit session grouping.';



-- ============================================================
-- COORDINATOR DELETE GUARD
-- ============================================================

create or replace function
public.enforce_timetable_session_group_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_explicit_group_count integer;

begin

  -- Service/background operations without an authenticated user
  -- are not Builder mutations.

  if auth.uid() is null then
    return null;
  end if;


  -- Main Admin cascade cleanup and other non-Coordinator
  -- maintenance must remain possible.
  --
  -- Normal timetable editing/removal is Coordinator RPC-only.

  if public.current_campus_role() <>
    'Coordinator'
  then
    return null;
  end if;


  -- Legacy-only deletes retain the old contiguous-session
  -- validation inside the Builder RPCs.

  if not exists (

    select
      1

    from
      deleted_entries deleted

    where
      deleted.session_group_id
        is not null

  )
  then
    return null;
  end if;


  -- Never combine explicit-session rows with legacy NULL rows
  -- in one Coordinator edit/remove operation.

  if
    exists (

      select
        1

      from
        deleted_entries deleted

      where
        deleted.session_group_id
          is null
    )

    and

    exists (

      select
        1

      from
        deleted_entries deleted

      where
        deleted.session_group_id
          is not null
    )

  then

    raise exception
      'Selected timetable periods mix legacy and explicit sessions. Edit or remove one complete session at a time.';

  end if;


  select
    count(
      distinct deleted.session_group_id
    )

  into
    v_explicit_group_count

  from
    deleted_entries deleted

  where
    deleted.session_group_id
      is not null;


  if v_explicit_group_count > 1
  then

    raise exception
      'Selected timetable periods belong to more than one teaching session. Edit or remove one session at a time.';

  end if;


  -- AFTER DELETE sees rows that remain in the live table.
  --
  -- If a row with the same publication + session_group_id still
  -- exists, the caller attempted to delete only part of the
  -- logical session. Raising here rolls the DELETE statement
  -- and the enclosing RPC transaction back atomically.

  if exists (

    select
      1

    from
      deleted_entries deleted

    join
      public.batch_timetable_entries remaining

        on remaining.publication_id =
          deleted.publication_id

        and remaining.session_group_id =
          deleted.session_group_id

    where
      deleted.session_group_id
        is not null

  )
  then

    raise exception
      'A multi-period teaching session must be edited or removed as one complete session.';

  end if;


  return null;

end;
$$;


revoke all
on function
public.enforce_timetable_session_group_delete()
from public, anon;


drop trigger if exists
enforce_timetable_session_group_delete_trigger
on public.batch_timetable_entries;


create trigger
enforce_timetable_session_group_delete_trigger

after delete
on public.batch_timetable_entries

referencing old table as deleted_entries

for each statement

execute function
public.enforce_timetable_session_group_delete();




create or replace function
public.get_my_timetable_builder_batch(
  p_batch_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare

  v_batch
    public.attendance_batches%rowtype;

  v_profile_id uuid;

  v_draft_publication_id uuid;

  v_published_publication_id uuid;

  v_source_publication_id uuid;

  v_result jsonb;

begin

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  if public.current_campus_role() <>
    'Coordinator'
  then
    raise exception
      'Timetable Coordinator permission required.';
  end if;


  if not
    public.is_timetable_coordinator_for_batch(
      p_batch_id
    )
  then
    raise exception
      'This batch is outside your Timetable Coordinator department.';
  end if;


  select
    batch.*

  into
    v_batch

  from
    public.attendance_batches batch

  where
    batch.id =
      p_batch_id;


  if v_batch.id is null then
    raise exception
      'Selected batch does not exist.';
  end if;


  select
    mapping.profile_id

  into
    v_profile_id

  from
    public.timetable_batch_profiles mapping

  where
    mapping.batch_id =
      p_batch_id;


  select
    builder.publication_id

  into
    v_draft_publication_id

  from
    public.timetable_builder_drafts builder

  join
    public.timetable_publications publication

      on publication.id =
        builder.publication_id

  where
    builder.batch_id =
      p_batch_id

    and builder.is_active

    and publication.status =
      'Draft'

  order by
    builder.created_at desc

  limit 1;


  select
    publication.id

  into
    v_published_publication_id

  from
    public.timetable_publications publication

  where
    publication.batch_id =
      p_batch_id

    and publication.status =
      'Published'

  order by
    publication.version_number desc

  limit 1;


  v_source_publication_id :=
    coalesce(
      v_draft_publication_id,
      v_published_publication_id
    );


  select
    jsonb_build_object(

      'batch',

        jsonb_build_object(

          'id',
            v_batch.id,

          'batchName',
            v_batch.batch_name,

          'section',
            v_batch.section,

          'department',
            v_batch.department,

          'academicYear',
            v_batch.academic_year,

          'semester',
            v_batch.semester

        ),


      'profile',

        (
          select
            jsonb_build_object(

              'id',
                profile.id,

              'name',
                profile.name,

              'department',
                profile.department,

              'academicYear',
                profile.academic_year,

              'semester',
                profile.semester

            )

          from
            public.timetable_scheduling_profiles profile

          where
            profile.id =
              v_profile_id
        ),


      'workingDays',

        coalesce(
          (
            select
              jsonb_agg(

                jsonb_build_object(

                  'id',
                    day.id,

                  'dayOfWeek',
                    day.day_of_week,

                  'displayOrder',
                    day.display_order,

                  'isWorkingDay',
                    day.is_working_day

                )

                order by
                  day.display_order
              )

            from
              public.timetable_working_days day

            where
              day.profile_id =
                v_profile_id
          ),

          '[]'::jsonb
        ),


      'periodSlots',

        coalesce(
          (
            select
              jsonb_agg(

                jsonb_build_object(

                  'id',
                    slot.id,

                  'periodOrder',
                    slot.period_order,

                  'label',
                    slot.label,

                  'startTime',
                    slot.start_time,

                  'endTime',
                    slot.end_time,

                  'isTeachingSlot',
                    slot.is_teaching_slot

                )

                order by
                  slot.period_order
              )

            from
              public.timetable_period_slots slot

            where
              slot.profile_id =
                v_profile_id
          ),

          '[]'::jsonb
        ),


      'resources',

        coalesce(
          (
            select
              jsonb_agg(

                jsonb_build_object(

                  'id',
                    resource.id,

                  'code',
                    resource.resource_code,

                  'name',
                    resource.resource_name,

                  'type',
                    resource.resource_type,

                  'building',
                    resource.building,

                  'floor',
                    resource.floor,

                  'capacity',
                    resource.capacity

                )

                order by
                  resource.resource_code
              )

            from
              public.timetable_resources resource

            where
              lower(
                btrim(
                  resource.department
                )
              ) =
              lower(
                btrim(
                  v_batch.department
                )
              )

              and resource.is_active
          ),

          '[]'::jsonb
        ),


      'subjects',

        coalesce(
          (
            select
              jsonb_agg(

                jsonb_build_object(

                  'id',
                    subject.id,

                  'subjectName',
                    subject.subject_name,

                  'subjectCode',
                    subject.subject_code,

                  'subjectType',
                    subject.subject_type,

                  'facultyId',
                    subject.faculty_id,

                  'facultyName',
                    subject.faculty_name

                )

                order by
                  subject.subject_name
              )

            from
              public.attendance_batch_subjects subject

            where
              subject.batch_id =
                p_batch_id
          ),

          '[]'::jsonb
        ),


      'allocations',

        coalesce(
          (
            select
              jsonb_agg(

                jsonb_build_object(

                  'id',
                    allocation.id,

                  'batchSubjectId',
                    allocation.batch_subject_id,

                  'facultyId',
                    allocation.faculty_id,

                  'facultyName',
                    allocation.faculty_name,

                  'allocationType',
                    allocation.allocation_type,

                  'subgroup',
                    allocation.subgroup,

                  'weeklyHours',
                    allocation.weekly_hours,

                  'sessionLengthPeriods',
                    allocation.session_length_periods,

                  'isPrimary',
                    allocation.is_primary

                )

                order by
                  allocation.faculty_name,
                  allocation.allocation_type
              )

            from
              public.faculty_teaching_allocations allocation

            where
              allocation.batch_id =
                p_batch_id

              and allocation.status =
                'Active'
          ),

          '[]'::jsonb
        ),


      'publishedPublication',

        (
          select
            jsonb_build_object(

              'id',
                publication.id,

              'versionNumber',
                publication.version_number,

              'publishedAt',
                publication.published_at

            )

          from
            public.timetable_publications publication

          where
            publication.id =
              v_published_publication_id
        ),


      'draftPublication',

        (
          select
            jsonb_build_object(

              'id',
                publication.id,

              'versionNumber',
                publication.version_number,

              'createdAt',
                publication.created_at

            )

          from
            public.timetable_publications publication

          where
            publication.id =
              v_draft_publication_id
        ),


      'mode',

        case

          when
            v_draft_publication_id
              is not null
          then
            'Draft'

          when
            v_published_publication_id
              is not null
          then
            'Published'

          else
            'Empty'

        end,


      'entries',

        coalesce(
          (
            select
              jsonb_agg(

                jsonb_build_object(

                  'id',
                    entry.id,

              'sessionGroupId',
                entry.session_group_id,

                  'batchId',
                    entry.batch_id,

                  'batchSubjectId',
                    entry.batch_subject_id,

                  'subjectCode',
                    subject.subject_code,

                  'subjectName',
                    subject.subject_name,

                  'facultyId',
                    entry.faculty_id,

                  'facultyName',
                    entry.faculty_name,

                  'dayOfWeek',
                    entry.day_of_week,

                  'periodOrder',
                    entry.period_order,

                  'startTime',
                    entry.start_time,

                  'endTime',
                    entry.end_time,

                  'subgroup',
                    entry.subgroup,

                  'resourceId',
                    entry.resource_id,

                  'room',
                    entry.room,

                  'classType',
                    entry.class_type,

                  'notes',
                    entry.notes

                )

                order by
                  entry.day_of_week,
                  entry.period_order,
                  entry.subgroup
              )

            from
              public.batch_timetable_entries entry

            join
              public.attendance_batch_subjects subject

                on subject.id =
                  entry.batch_subject_id

            where
              entry.publication_id =
                v_source_publication_id
          ),

          '[]'::jsonb
        )

    )

  into
    v_result;


  return
    v_result;

end;
$$;

create or replace function
public.start_timetable_builder_draft(
  p_batch_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_profile_id uuid;

  v_existing_draft_id uuid;

  v_existing_version integer;

  v_current_publication_id uuid;

  v_current_version integer;

  v_new_publication_id uuid;

  v_next_version integer;

  v_entry_count integer;

begin

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  if public.current_campus_role() <>
    'Coordinator'
  then
    raise exception
      'Timetable Coordinator permission required.';
  end if;


  if not
    public.is_timetable_coordinator_for_batch(
      p_batch_id
    )
  then
    raise exception
      'This batch is outside your Timetable Coordinator department.';
  end if;


  perform
    pg_catalog.pg_advisory_xact_lock(
      20260919122000
    );


  select
    mapping.profile_id

  into
    v_profile_id

  from
    public.timetable_batch_profiles mapping

  where
    mapping.batch_id =
      p_batch_id;


  if v_profile_id is null then
    raise exception
      'This batch does not have a timetable scheduling profile. Configure its period structure first.';
  end if;


  if not exists (

    select
      1

    from
      public.timetable_working_days day

    where
      day.profile_id =
        v_profile_id

      and day.is_working_day

  ) then
    raise exception
      'This timetable profile has no active working days.';
  end if;


  if not exists (

    select
      1

    from
      public.timetable_period_slots slot

    where
      slot.profile_id =
        v_profile_id

      and slot.is_teaching_slot

  ) then
    raise exception
      'This timetable profile has no teaching periods.';
  end if;


  update
    public.timetable_builder_drafts builder

  set
    is_active =
      false,

    updated_at =
      now()

  where
    builder.batch_id =
      p_batch_id

    and builder.is_active

    and not exists (

      select
        1

      from
        public.timetable_publications publication

      where
        publication.id =
          builder.publication_id

        and publication.status =
          'Draft'
    );


  select
    builder.publication_id,
    publication.version_number

  into
    v_existing_draft_id,
    v_existing_version

  from
    public.timetable_builder_drafts builder

  join
    public.timetable_publications publication

      on publication.id =
        builder.publication_id

  where
    builder.batch_id =
      p_batch_id

    and builder.is_active

    and publication.status =
      'Draft'

  order by
    builder.created_at desc

  limit 1

  for update of
    builder,
    publication;


  if v_existing_draft_id is not null then

    return
      jsonb_build_object(

        'publicationId',
          v_existing_draft_id,

        'versionNumber',
          v_existing_version,

        'resumed',
          true

      );

  end if;


  select
    publication.id,
    publication.version_number

  into
    v_current_publication_id,
    v_current_version

  from
    public.timetable_publications publication

  where
    publication.batch_id =
      p_batch_id

    and publication.status =
      'Published'

  order by
    publication.version_number desc

  limit 1

  for update;


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
      p_batch_id;


  insert into
  public.timetable_publications (

    batch_id,
    version_number,
    status,
    published_by,
    published_at,
    created_by

  )
  values (

    p_batch_id,
    v_next_version,
    'Draft',
    null,
    null,
    auth.uid()

  )
  returning
    id

  into
    v_new_publication_id;


  insert into
  public.timetable_builder_drafts (

    batch_id,
    publication_id,
    base_publication_id,
    coordinator_id

  )
  values (

    p_batch_id,
    v_new_publication_id,
    v_current_publication_id,
    auth.uid()

  );


  if v_current_publication_id
    is not null
  then

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
        v_current_publication_id;

  end if;


  select
    count(*)

  into
    v_entry_count

  from
    public.batch_timetable_entries entry

  where
    entry.publication_id =
      v_new_publication_id;


  return
    jsonb_build_object(

      'publicationId',
        v_new_publication_id,

      'versionNumber',
        v_next_version,

      'basePublicationId',
        v_current_publication_id,

      'baseVersion',
        v_current_version,

      'entryCount',
        v_entry_count,

      'resumed',
        false

    );

end;
$$;

create or replace function
public.save_timetable_builder_session(

  p_batch_id uuid,

  p_day_of_week text,

  p_period_slot_ids uuid[],

  p_batch_subject_id uuid,

  p_faculty_id uuid,

  p_resource_id uuid
    default null,

  p_room text
    default '',

  p_class_type text
    default 'Lecture',

  p_subgroup text
    default '',

  p_replace_entry_ids uuid[]
    default '{}'::uuid[],

  p_notes text
    default ''

)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_profile_id uuid;

  v_department text;

  v_draft_publication_id uuid;

  v_slot_ids uuid[];

  v_replace_ids uuid[];

  v_slot_count integer;

  v_slot_min integer;

  v_slot_max integer;

  v_replace_count integer;

  v_replace_min integer;

  v_replace_max integer;

  v_replace_subject_count integer;

  v_replace_faculty_count integer;

  v_replace_day_count integer;

  v_replace_subgroup_count integer;

  v_subject
    public.attendance_batch_subjects%rowtype;

  v_resource
    public.timetable_resources%rowtype;

  v_slot
    public.timetable_period_slots%rowtype;

  v_faculty_name text;

  v_room text;

  v_class_type text;

  v_subgroup text;

  v_inserted_ids jsonb :=
    '[]'::jsonb;

  v_new_entry_id uuid;

  v_session_group_id uuid :=
    gen_random_uuid();

begin

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  if public.current_campus_role() <>
    'Coordinator'
  then
    raise exception
      'Timetable Coordinator permission required.';
  end if;


  if not
    public.is_timetable_coordinator_for_batch(
      p_batch_id
    )
  then
    raise exception
      'This batch is outside your Timetable Coordinator department.';
  end if;


  perform
    pg_catalog.pg_advisory_xact_lock(
      20260919122000
    );


  select
    batch.department,
    mapping.profile_id

  into
    v_department,
    v_profile_id

  from
    public.attendance_batches batch

  left join
    public.timetable_batch_profiles mapping

      on mapping.batch_id =
        batch.id

  where
    batch.id =
      p_batch_id;


  if v_profile_id is null then
    raise exception
      'This batch does not have a timetable scheduling profile.';
  end if;


  select
    builder.publication_id

  into
    v_draft_publication_id

  from
    public.timetable_builder_drafts builder

  join
    public.timetable_publications publication

      on publication.id =
        builder.publication_id

  where
    builder.batch_id =
      p_batch_id

    and builder.is_active

    and publication.status =
      'Draft'

  order by
    builder.created_at desc

  limit 1

  for update of
    builder,
    publication;


  if v_draft_publication_id
    is null
  then
    raise exception
      'Start a timetable draft before editing the grid.';
  end if;


  if btrim(
    coalesce(
      p_day_of_week,
      ''
    )
  ) = ''
  then
    raise exception
      'Working day is required.';
  end if;


  if not exists (

    select
      1

    from
      public.timetable_working_days day

    where
      day.profile_id =
        v_profile_id

      and day.day_of_week =
        p_day_of_week

      and day.is_working_day

  ) then
    raise exception
      'Selected day is not an active working day for this batch.';
  end if;


  select
    array_agg(
      distinct supplied.slot_id
    )

  into
    v_slot_ids

  from
    unnest(
      coalesce(
        p_period_slot_ids,
        '{}'::uuid[]
      )
    )
    as supplied(slot_id);


  if coalesce(
    cardinality(
      v_slot_ids
    ),
    0
  ) < 1
  then
    raise exception
      'Select at least one teaching period.';
  end if;


  if cardinality(
    v_slot_ids
  ) > 6
  then
    raise exception
      'A timetable session cannot exceed six consecutive periods.';
  end if;


  select
    count(*),
    min(
      slot.period_order
    ),
    max(
      slot.period_order
    )

  into
    v_slot_count,
    v_slot_min,
    v_slot_max

  from
    public.timetable_period_slots slot

  where
    slot.id =
      any(
        v_slot_ids
      )

    and slot.profile_id =
      v_profile_id

    and slot.is_teaching_slot;


  if v_slot_count <>
    cardinality(
      v_slot_ids
    )
  then
    raise exception
      'One or more selected periods are invalid or are Break/Lunch slots.';
  end if;


  if
    v_slot_max -
    v_slot_min +
    1
    <>
    v_slot_count
  then
    raise exception
      'Multi-period classes must use consecutive teaching periods and cannot cross a break.';
  end if;


  select
    subject.*

  into
    v_subject

  from
    public.attendance_batch_subjects subject

  where
    subject.id =
      p_batch_subject_id

    and subject.batch_id =
      p_batch_id;


  if v_subject.id is null then
    raise exception
      'Selected subject does not belong to this batch.';
  end if;


  v_subgroup :=
    upper(
      btrim(
        coalesce(
          p_subgroup,
          ''
        )
      )
    );


  if not (

    v_subject.faculty_id =
      p_faculty_id

    or exists (

      select
        1

      from
        public.faculty_teaching_allocations allocation

      where
        allocation.batch_id =
          p_batch_id

        and allocation.batch_subject_id =
          p_batch_subject_id

        and allocation.faculty_id =
          p_faculty_id

        and allocation.status =
          'Active'

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
          v_subgroup

        )
    )

  ) then
    raise exception
      'Selected Faculty member is not actively assigned to this subject.';
  end if;


  select
    allocation.faculty_name

  into
    v_faculty_name

  from
    public.faculty_teaching_allocations allocation

  where
    allocation.batch_id =
      p_batch_id

    and allocation.batch_subject_id =
      p_batch_subject_id

    and allocation.faculty_id =
      p_faculty_id

    and allocation.status =
      'Active'

  order by
    allocation.is_primary desc,
    allocation.created_at

  limit 1;


  if btrim(
    coalesce(
      v_faculty_name,
      ''
    )
  ) = ''
  then

    if v_subject.faculty_id =
      p_faculty_id
    then

      v_faculty_name :=
        v_subject.faculty_name;

    else

      select
        profile.full_name

      into
        v_faculty_name

      from
        public.profiles profile

      where
        profile.id =
          p_faculty_id;

    end if;

  end if;


  if btrim(
    coalesce(
      v_faculty_name,
      ''
    )
  ) = ''
  then
    v_faculty_name :=
      'Faculty';
  end if;


  v_room :=
    btrim(
      coalesce(
        p_room,
        ''
      )
    );


  if p_resource_id
    is not null
  then

    select
      resource.*

    into
      v_resource

    from
      public.timetable_resources resource

    where
      resource.id =
        p_resource_id

      and resource.is_active

      and lower(
        btrim(
          resource.department
        )
      ) =
      lower(
        btrim(
          v_department
        )
      );


    if v_resource.id
      is null
    then
      raise exception
        'Selected room/lab resource is unavailable for this department.';
    end if;


    if v_room = '' then

      v_room :=
        coalesce(
          nullif(
            btrim(
              v_resource.resource_code
            ),
            ''
          ),
          v_resource.resource_name
        );

    end if;

  end if;


  v_class_type :=
    btrim(
      coalesce(
        p_class_type,
        ''
      )
    );


  if v_class_type = '' then
    v_class_type :=
      'Lecture';
  end if;


  if char_length(
    v_class_type
  ) > 60
  then
    raise exception
      'Class type is too long.';
  end if;


  select
    array_agg(
      distinct supplied.entry_id
    )

  into
    v_replace_ids

  from
    unnest(
      coalesce(
        p_replace_entry_ids,
        '{}'::uuid[]
      )
    )
    as supplied(entry_id);


  if coalesce(
    cardinality(
      v_replace_ids
    ),
    0
  ) > 0
  then

    select
      count(*),
      min(
        entry.period_order
      ),
      max(
        entry.period_order
      ),
      count(
        distinct entry.batch_subject_id
      ),
      count(
        distinct entry.faculty_id
      ),
      count(
        distinct entry.day_of_week
      ),
      count(
        distinct upper(
          btrim(
            coalesce(
              entry.subgroup,
              ''
            )
          )
        )
      )

    into
      v_replace_count,
      v_replace_min,
      v_replace_max,
      v_replace_subject_count,
      v_replace_faculty_count,
      v_replace_day_count,
      v_replace_subgroup_count

    from
      public.batch_timetable_entries entry

    where
      entry.id =
        any(
          v_replace_ids
        )

      and entry.batch_id =
        p_batch_id

      and entry.publication_id =
        v_draft_publication_id;


    if v_replace_count <>
      cardinality(
        v_replace_ids
      )
    then
      raise exception
        'One or more classes selected for editing are no longer part of this draft.';
    end if;


    if
      v_replace_subject_count <> 1
      or v_replace_faculty_count <> 1
      or v_replace_day_count <> 1
      or v_replace_subgroup_count <> 1
      or (
        v_replace_max -
        v_replace_min +
        1
      ) <>
      v_replace_count
    then
      raise exception
        'Only one complete contiguous teaching session can be edited at a time.';
    end if;


    delete from
      public.batch_timetable_entries entry

    where
      entry.id =
        any(
          v_replace_ids
        )

      and entry.publication_id =
        v_draft_publication_id;

  end if;


  for v_slot in

    select
      slot.*

    from
      public.timetable_period_slots slot

    where
      slot.id =
        any(
          v_slot_ids
        )

    order by
      slot.period_order

  loop

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

      p_batch_id,
      p_batch_subject_id,
      p_faculty_id,
      v_faculty_name,
      p_day_of_week,
      v_slot.period_order,
      v_slot.start_time,
      v_slot.end_time,
      v_room,
      v_class_type,
      btrim(
        coalesce(
          p_notes,
          ''
        )
      ),
      auth.uid(),
      v_subgroup,
      p_resource_id,
      v_session_group_id,

      v_draft_publication_id

    )
    returning
      id

    into
      v_new_entry_id;


    v_inserted_ids :=
      v_inserted_ids ||
      jsonb_build_array(
        v_new_entry_id
      );

  end loop;


  update
    public.timetable_builder_drafts

  set
    coordinator_id =
      auth.uid(),

    updated_at =
      now()

  where
    publication_id =
      v_draft_publication_id;


  update
    public.timetable_publications

  set
    updated_at =
      now()

  where
    id =
      v_draft_publication_id;


  return
    jsonb_build_object(

      'publicationId',
        v_draft_publication_id,

      'entryIds',
        v_inserted_ids,

      'periodCount',
        cardinality(
          v_slot_ids
        )

    );

end;
$$;

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

  elsif exists (

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



notify pgrst,
  'reload schema';
