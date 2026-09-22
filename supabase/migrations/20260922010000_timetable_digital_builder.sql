-- ============================================================
-- CAMPUSCONNECT — DIGITAL TIMETABLE BUILDER
--
-- Timetable Coordinator:
--
--   Batch -> Draft -> Edit grid -> Validate -> Publish
--
-- Important:
--
--   • Coordinator authority is department scoped.
--   • Every batch owns an independent timetable.
--   • Faculty may teach many periods/batches.
--   • Faculty cannot overlap in real time.
--   • Rooms/resources cannot overlap.
--   • Multi-period labs are stored as consecutive period rows.
--   • Published history is never deleted.
--   • Builder drafts remember the Published version they were
--     based on, preventing stale drafts from overwriting a
--     newer timetable.
-- ============================================================


-- ============================================================
-- 1. BUILDER DRAFT METADATA
-- ============================================================

create table if not exists
public.timetable_builder_drafts (

  id uuid primary key
    default gen_random_uuid(),

  batch_id uuid not null
    references public.attendance_batches(id)
    on delete cascade,

  publication_id uuid not null unique
    references public.timetable_publications(id)
    on delete cascade,

  base_publication_id uuid
    references public.timetable_publications(id)
    on delete set null,

  coordinator_id uuid not null
    references auth.users(id)
    on delete restrict,

  is_active boolean not null
    default true,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create unique index if not exists
timetable_builder_one_active_draft_per_batch_idx
on public.timetable_builder_drafts(
  batch_id
)
where is_active;


create index if not exists
timetable_builder_drafts_coordinator_idx
on public.timetable_builder_drafts(
  coordinator_id,
  is_active
);


alter table
public.timetable_builder_drafts
enable row level security;


revoke all
on table
public.timetable_builder_drafts
from public, anon, authenticated;



-- ============================================================
-- 2. COORDINATOR WORKSPACE
-- ============================================================

create or replace function
public.get_my_timetable_builder_workspace()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare

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


  select
    jsonb_build_object(

      'departments',

        coalesce(
          (
            select
              jsonb_agg(
                assignment.department
                order by
                  assignment.department
              )

            from
              public.timetable_coordinator_assignments assignment

            where
              assignment.coordinator_id =
                auth.uid()

              and assignment.is_active
          ),
          '[]'::jsonb
        ),


      'batches',

        coalesce(
          (
            select
              jsonb_agg(

                jsonb_build_object(

                  'id',
                    batch.id,

                  'batchName',
                    batch.batch_name,

                  'section',
                    batch.section,

                  'department',
                    batch.department,

                  'academicYear',
                    batch.academic_year,

                  'semester',
                    batch.semester,

                  'profileId',
                    mapping.profile_id,

                  'profileName',
                    profile.name,

                  'publishedPublicationId',
                    published.id,

                  'publishedVersion',
                    published.version_number,

                  'draftPublicationId',
                    builder.publication_id,

                  'draftVersion',
                    draft_publication.version_number

                )

                order by
                  batch.department,
                  batch.batch_name,
                  batch.section

              )

            from
              public.attendance_batches batch

            join
              public.timetable_coordinator_assignments assignment

                on lower(
                  btrim(
                    assignment.department
                  )
                ) =
                lower(
                  btrim(
                    batch.department
                  )
                )

              and assignment.coordinator_id =
                auth.uid()

              and assignment.is_active

            left join
              public.timetable_batch_profiles mapping

                on mapping.batch_id =
                  batch.id

            left join
              public.timetable_scheduling_profiles profile

                on profile.id =
                  mapping.profile_id


            left join lateral (

              select
                publication.id,
                publication.version_number

              from
                public.timetable_publications publication

              where
                publication.batch_id =
                  batch.id

                and publication.status =
                  'Published'

              order by
                publication.version_number desc

              limit 1

            ) published
              on true


            left join
              public.timetable_builder_drafts builder

                on builder.batch_id =
                  batch.id

              and builder.is_active


            left join
              public.timetable_publications draft_publication

                on draft_publication.id =
                  builder.publication_id

              and draft_publication.status =
                  'Draft'
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



-- ============================================================
-- 3. ONE BATCH — COMPLETE BUILDER STATE
-- ============================================================

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



-- ============================================================
-- 4. START / RESUME DIGITAL BUILDER DRAFT
-- ============================================================

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



-- ============================================================
-- 5. ADD / EDIT ONE COMPLETE TEACHING SESSION
--
-- p_period_slot_ids may contain:
--
--   1 period  -> lecture
--   2 periods -> lab
--   3 periods -> long practical/project
--
-- Every selected slot must be directly consecutive and the
-- session may NOT jump across a configured Break/Lunch slot.
--
-- p_replace_entry_ids is empty when adding.
-- When editing, it contains ALL rows of the old contiguous
-- session so the complete session is replaced atomically.
-- ============================================================

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



-- ============================================================
-- 6. REMOVE ONE COMPLETE SESSION
-- ============================================================

create or replace function
public.remove_timetable_builder_session(

  p_batch_id uuid,

  p_entry_ids uuid[]

)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_draft_publication_id uuid;

  v_ids uuid[];

  v_count integer;

  v_min integer;

  v_max integer;

  v_subject_count integer;

  v_faculty_count integer;

  v_day_count integer;

  v_subgroup_count integer;

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

  limit 1

  for update of
    builder,
    publication;


  if v_draft_publication_id
    is null
  then
    raise exception
      'There is no active builder draft for this batch.';
  end if;


  select
    array_agg(
      distinct supplied.entry_id
    )

  into
    v_ids

  from
    unnest(
      coalesce(
        p_entry_ids,
        '{}'::uuid[]
      )
    )
    as supplied(entry_id);


  if coalesce(
    cardinality(
      v_ids
    ),
    0
  ) < 1
  then
    raise exception
      'Select a timetable session to remove.';
  end if;


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
    v_count,
    v_min,
    v_max,
    v_subject_count,
    v_faculty_count,
    v_day_count,
    v_subgroup_count

  from
    public.batch_timetable_entries entry

  where
    entry.id =
      any(
        v_ids
      )

    and entry.batch_id =
      p_batch_id

    and entry.publication_id =
      v_draft_publication_id;


  if v_count <>
    cardinality(
      v_ids
    )
  then
    raise exception
      'One or more selected timetable periods no longer exist in this draft.';
  end if;


  if
    v_subject_count <> 1
    or v_faculty_count <> 1
    or v_day_count <> 1
    or v_subgroup_count <> 1
    or (
      v_max -
      v_min +
      1
    ) <>
    v_count
  then
    raise exception
      'Remove one complete contiguous teaching session at a time.';
  end if;


  delete from
    public.batch_timetable_entries entry

  where
    entry.id =
      any(
        v_ids
      )

    and entry.publication_id =
      v_draft_publication_id;


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


  return
    jsonb_build_object(

      'publicationId',
        v_draft_publication_id,

      'removedPeriods',
        v_count

    );

end;
$$;



-- ============================================================
-- 7. VALIDATE BUILDER DRAFT
-- ============================================================

create or replace function
public.validate_timetable_builder_draft(
  p_batch_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare

  v_draft_publication_id uuid;

  v_profile_id uuid;

  v_department text;

  v_entry_count integer :=
    0;

  v_issues jsonb :=
    '[]'::jsonb;

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

  limit 1;


  if v_draft_publication_id
    is null
  then

    return
      jsonb_build_object(

        'valid',
          false,

        'issueCount',
          1,

        'issues',
          jsonb_build_array(
            'No active timetable draft exists for this batch.'
          ),

        'entryCount',
          0
      );

  end if;


  select
    count(*)

  into
    v_entry_count

  from
    public.batch_timetable_entries entry

  where
    entry.publication_id =
      v_draft_publication_id;


  if v_entry_count = 0 then

    v_issues :=
      v_issues ||
      jsonb_build_array(
        'The timetable draft is empty.'
      );

  end if;


  if v_profile_id is null then

    v_issues :=
      v_issues ||
      jsonb_build_array(
        'The batch does not have a scheduling profile.'
      );

  end if;


  if exists (

    select
      1

    from
      public.batch_timetable_entries entry

    left join
      public.timetable_period_slots slot

        on slot.profile_id =
          v_profile_id

      and slot.period_order =
        entry.period_order

      and slot.start_time =
        entry.start_time

      and slot.end_time =
        entry.end_time

      and slot.is_teaching_slot

    where
      entry.publication_id =
        v_draft_publication_id

      and slot.id is null

  ) then

    v_issues :=
      v_issues ||
      jsonb_build_array(
        'One or more classes no longer match the configured teaching periods.'
      );

  end if;


  if exists (

    select
      1

    from
      public.batch_timetable_entries entry

    where
      entry.publication_id =
        v_draft_publication_id

      and not exists (

        select
          1

        from
          public.timetable_working_days day

        where
          day.profile_id =
            v_profile_id

          and day.day_of_week =
            entry.day_of_week

          and day.is_working_day
      )

  ) then

    v_issues :=
      v_issues ||
      jsonb_build_array(
        'One or more classes are scheduled on a disabled working day.'
      );

  end if;


  if exists (

    select
      1

    from
      public.batch_timetable_entries entry

    left join
      public.attendance_batch_subjects subject

        on subject.id =
          entry.batch_subject_id

      and subject.batch_id =
        p_batch_id

    where
      entry.publication_id =
        v_draft_publication_id

      and subject.id is null

  ) then

    v_issues :=
      v_issues ||
      jsonb_build_array(
        'One or more timetable subjects no longer belong to this batch.'
      );

  end if;


  if exists (

    select
      1

    from
      public.batch_timetable_entries entry

    join
      public.attendance_batch_subjects subject

        on subject.id =
          entry.batch_subject_id

    where
      entry.publication_id =
        v_draft_publication_id

      and not (

        subject.faculty_id =
          entry.faculty_id

        or exists (

          select
            1

          from
            public.faculty_teaching_allocations allocation

          where
            allocation.batch_id =
              p_batch_id

            and allocation.batch_subject_id =
              entry.batch_subject_id

            and allocation.faculty_id =
              entry.faculty_id

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
              upper(
                btrim(
                  coalesce(
                    entry.subgroup,
                    ''
                  )
                )
              )

            )
        )
      )

  ) then

    v_issues :=
      v_issues ||
      jsonb_build_array(
        'A Faculty assignment changed after this draft was created.'
      );

  end if;


  if exists (

    select
      1

    from
      public.batch_timetable_entries entry

    left join
      public.timetable_resources resource

        on resource.id =
          entry.resource_id

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
      )

    where
      entry.publication_id =
        v_draft_publication_id

      and entry.resource_id
        is not null

      and resource.id
        is null

  ) then

    v_issues :=
      v_issues ||
      jsonb_build_array(
        'A room/lab resource used by this draft is no longer active.'
      );

  end if;


  -- ----------------------------------------------------------
  -- FACULTY CROSS-BATCH CONFLICT
  -- ----------------------------------------------------------

  if exists (

    select
      1

    from
      public.batch_timetable_entries draft_entry

    join
      public.batch_timetable_entries existing

        on existing.faculty_id =
          draft_entry.faculty_id

      and existing.day_of_week =
        draft_entry.day_of_week

      and draft_entry.start_time <
        existing.end_time

      and draft_entry.end_time >
        existing.start_time

    join
      public.timetable_publications publication

        on publication.id =
          existing.publication_id

      and publication.status =
        'Published'

    where
      draft_entry.publication_id =
        v_draft_publication_id

      and existing.batch_id <>
        p_batch_id

  ) then

    v_issues :=
      v_issues ||
      jsonb_build_array(
        'Faculty collision detected with another Published batch timetable.'
      );

  end if;


  -- ----------------------------------------------------------
  -- RESOURCE UUID CROSS-BATCH CONFLICT
  -- ----------------------------------------------------------

  if exists (

    select
      1

    from
      public.batch_timetable_entries draft_entry

    join
      public.batch_timetable_entries existing

        on existing.resource_id =
          draft_entry.resource_id

      and existing.day_of_week =
        draft_entry.day_of_week

      and draft_entry.start_time <
        existing.end_time

      and draft_entry.end_time >
        existing.start_time

    join
      public.timetable_publications publication

        on publication.id =
          existing.publication_id

      and publication.status =
        'Published'

    where
      draft_entry.publication_id =
        v_draft_publication_id

      and draft_entry.resource_id
        is not null

      and existing.batch_id <>
        p_batch_id

  ) then

    v_issues :=
      v_issues ||
      jsonb_build_array(
        'Room/lab resource collision detected with another Published batch timetable.'
      );

  end if;


  -- ----------------------------------------------------------
  -- LEGACY ROOM STRING CROSS-BATCH CONFLICT
  -- ----------------------------------------------------------

  if exists (

    select
      1

    from
      public.batch_timetable_entries draft_entry

    join
      public.batch_timetable_entries existing

        on lower(
          btrim(
            existing.room
          )
        ) =
        lower(
          btrim(
            draft_entry.room
          )
        )

      and existing.day_of_week =
        draft_entry.day_of_week

      and draft_entry.start_time <
        existing.end_time

      and draft_entry.end_time >
        existing.start_time

    join
      public.timetable_publications publication

        on publication.id =
          existing.publication_id

      and publication.status =
        'Published'

    where
      draft_entry.publication_id =
        v_draft_publication_id

      and draft_entry.resource_id
        is null

      and existing.resource_id
        is null

      and btrim(
        coalesce(
          draft_entry.room,
          ''
        )
      ) <> ''

      and existing.batch_id <>
        p_batch_id

  ) then

    v_issues :=
      v_issues ||
      jsonb_build_array(
        'Room collision detected with another Published batch timetable.'
      );

  end if;


  return
    jsonb_build_object(

      'valid',
        jsonb_array_length(
          v_issues
        ) = 0,

      'issueCount',
        jsonb_array_length(
          v_issues
        ),

      'issues',
        v_issues,

      'entryCount',
        v_entry_count,

      'publicationId',
        v_draft_publication_id

    );

end;
$$;



-- ============================================================
-- 8. PUBLISH DIGITAL BUILDER DRAFT
-- ============================================================

create or replace function
public.publish_timetable_builder_draft(
  p_batch_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_builder_id uuid;

  v_draft_publication_id uuid;

  v_base_publication_id uuid;

  v_draft_version integer;

  v_current_publication_id uuid;

  v_current_version integer;

  v_validation jsonb;

  v_issue_count integer;

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


  -- Same lock used by the historical generated-timetable
  -- publisher. This prevents publication races.

  perform
    pg_catalog.pg_advisory_xact_lock(
      20260919122000
    );


  select
    builder.id,
    builder.publication_id,
    builder.base_publication_id,
    publication.version_number

  into
    v_builder_id,
    v_draft_publication_id,
    v_base_publication_id,
    v_draft_version

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

  limit 1

  for update of
    builder,
    publication;


  if v_builder_id is null then
    raise exception
      'There is no active timetable builder draft to publish.';
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


  -- ----------------------------------------------------------
  -- STALE DRAFT PROTECTION
  -- ----------------------------------------------------------

  if
    v_base_publication_id
      is null

    and v_current_publication_id
      is not null
  then
    raise exception
      'A timetable was published after this draft started. Discard this draft and start again from the latest Published version.';
  end if;


  if
    v_base_publication_id
      is not null

    and v_current_publication_id
      is distinct from
      v_base_publication_id
  then
    raise exception
      'The Published timetable changed while this draft was being edited. Discard this draft and start again.';
  end if;


  v_validation :=
    public.validate_timetable_builder_draft(
      p_batch_id
    );


  v_issue_count :=
    coalesce(
      (
        v_validation
          ->>
        'issueCount'
      )::integer,
      0
    );


  if v_issue_count > 0 then
    raise exception
      'Timetable validation failed with % blocking issue(s): %',
      v_issue_count,
      v_validation -> 'issues';
  end if;


  select
    count(*)

  into
    v_entry_count

  from
    public.batch_timetable_entries entry

  where
    entry.publication_id =
      v_draft_publication_id;


  if v_entry_count = 0 then
    raise exception
      'Cannot publish an empty timetable.';
  end if;


  if v_current_publication_id
    is not null
  then

    update
      public.timetable_publications

    set
      status =
        'Superseded',

      updated_at =
        now()

    where
      id =
        v_current_publication_id;

  end if;


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
      v_draft_publication_id;


  update
    public.timetable_builder_drafts

  set
    is_active =
      false,

    coordinator_id =
      auth.uid(),

    updated_at =
      now()

  where
    id =
      v_builder_id;


  if v_current_publication_id
    is not null
  then

    update
      public.timetable_change_requests

    set
      status =
        'Cancelled',

      coordinator_id =
        auth.uid(),

      coordinator_note =
        case

          when btrim(
            coalesce(
              coordinator_note,
              ''
            )
          ) = ''
          then
            'A newer timetable version was published through the Digital Timetable Builder. Review the latest timetable and submit a new request if needed.'

          else
            coordinator_note ||
            E'\n\n' ||
            'A newer timetable version was published through the Digital Timetable Builder. Review the latest timetable and submit a new request if needed.'

        end,

      resolved_at =
        now(),

      updated_at =
        now()

    where
      batch_id =
        p_batch_id

      and publication_id =
        v_current_publication_id

      and status in (
        'Pending',
        'Reviewing'
      );

  end if;


  return
    jsonb_build_object(

      'publicationId',
        v_draft_publication_id,

      'versionNumber',
        v_draft_version,

      'previousVersion',
        v_current_version,

      'entryCount',
        v_entry_count

    );

end;
$$;



-- ============================================================
-- 9. DISCARD BUILDER DRAFT SAFELY
--
-- Nothing is deleted. Draft publication + its entry IDs remain
-- historical and are marked Superseded.
-- ============================================================

create or replace function
public.discard_timetable_builder_draft(
  p_batch_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_builder_id uuid;

  v_publication_id uuid;

  v_version integer;

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
    builder.id,
    builder.publication_id,
    publication.version_number

  into
    v_builder_id,
    v_publication_id,
    v_version

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

  limit 1

  for update of
    builder,
    publication;


  if v_builder_id is null then
    raise exception
      'There is no active timetable builder draft to discard.';
  end if;


  update
    public.timetable_publications

  set
    status =
      'Superseded',

    updated_at =
      now()

  where
    id =
      v_publication_id;


  update
    public.timetable_builder_drafts

  set
    is_active =
      false,

    coordinator_id =
      auth.uid(),

    updated_at =
      now()

  where
    id =
      v_builder_id;


  return
    jsonb_build_object(

      'discarded',
        true,

      'publicationId',
        v_publication_id,

      'versionNumber',
        v_version

    );

end;
$$;



-- ============================================================
-- 10. RPC PERMISSIONS
-- ============================================================

revoke all
on function
public.get_my_timetable_builder_workspace()
from public, anon;


grant execute
on function
public.get_my_timetable_builder_workspace()
to authenticated;


revoke all
on function
public.get_my_timetable_builder_batch(
  uuid
)
from public, anon;


grant execute
on function
public.get_my_timetable_builder_batch(
  uuid
)
to authenticated;


revoke all
on function
public.start_timetable_builder_draft(
  uuid
)
from public, anon;


grant execute
on function
public.start_timetable_builder_draft(
  uuid
)
to authenticated;


revoke all
on function
public.save_timetable_builder_session(
  uuid,
  text,
  uuid[],
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  uuid[],
  text
)
from public, anon;


grant execute
on function
public.save_timetable_builder_session(
  uuid,
  text,
  uuid[],
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  uuid[],
  text
)
to authenticated;


revoke all
on function
public.remove_timetable_builder_session(
  uuid,
  uuid[]
)
from public, anon;


grant execute
on function
public.remove_timetable_builder_session(
  uuid,
  uuid[]
)
to authenticated;


revoke all
on function
public.validate_timetable_builder_draft(
  uuid
)
from public, anon;


grant execute
on function
public.validate_timetable_builder_draft(
  uuid
)
to authenticated;


revoke all
on function
public.publish_timetable_builder_draft(
  uuid
)
from public, anon;


grant execute
on function
public.publish_timetable_builder_draft(
  uuid
)
to authenticated;


revoke all
on function
public.discard_timetable_builder_draft(
  uuid
)
from public, anon;


grant execute
on function
public.discard_timetable_builder_draft(
  uuid
)
to authenticated;



-- ============================================================
-- 11. DOCUMENTATION
-- ============================================================

comment on table
public.timetable_builder_drafts
is
'Tracks active Digital Timetable Builder drafts and the Published version each draft was based on.';


comment on function
public.save_timetable_builder_session(
  uuid,
  text,
  uuid[],
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  uuid[],
  text
)
is
'Timetable Coordinator-only atomic add/edit of one complete single or multi-period teaching session.';


comment on function
public.publish_timetable_builder_draft(
  uuid
)
is
'Timetable Coordinator-only atomic Draft to Published cutover with stale-draft and cross-batch conflict protection.';


notify pgrst,
  'reload schema';
