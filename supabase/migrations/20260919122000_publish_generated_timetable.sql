-- ============================================================
-- CAMPUSCONNECT
-- ATOMIC GENERATED TIMETABLE PUBLICATION
--
-- A publish:
--   1. requires Main Admin
--   2. serializes timetable publications
--   3. creates the next version as Draft
--   4. inserts every generated timetable period
--   5. lets existing DB triggers validate collisions
--   6. supersedes the old publication only after all inserts pass
--   7. marks the new version Published
--
-- Any exception rolls the complete RPC back.
-- ============================================================


create or replace function
public.publish_generated_timetable(
  p_batch_id uuid,
  p_entries jsonb
)
returns table (
  publication_id uuid,
  version_number integer,
  entry_count integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid;

  new_publication_id uuid;

  next_version integer;

  inserted_count integer :=
    0;

  payload_count integer :=
    0;

  entry jsonb;

  entry_batch_id uuid;
  entry_subject_id uuid;
  entry_faculty_id uuid;
  entry_resource_id uuid;

  entry_day text;
  entry_faculty_name text;
  entry_subgroup text;
  entry_room text;
  entry_class_type text;

  entry_period_order integer;

  entry_start_time time;
  entry_end_time time;
begin

  -- ----------------------------------------------------------
  -- AUTHORIZATION
  -- ----------------------------------------------------------

  caller_id :=
    auth.uid();


  if caller_id is null then
    raise exception
      'Authentication required';
  end if;


  if public.current_campus_role() <>
    'Main Admin'
  then
    raise exception
      'Only Main Admin can publish generated timetables';
  end if;


  -- ----------------------------------------------------------
  -- INPUT VALIDATION
  -- ----------------------------------------------------------

  if p_batch_id is null then
    raise exception
      'Batch is required';
  end if;


  if not exists (
    select 1
    from
      public.attendance_batches batch
    where
      batch.id =
        p_batch_id
  ) then
    raise exception
      'Selected batch does not exist';
  end if;


  if p_entries is null
    or jsonb_typeof(p_entries) <>
      'array'
  then
    raise exception
      'Timetable entries must be a JSON array';
  end if;


  payload_count :=
    jsonb_array_length(
      p_entries
    );


  if payload_count = 0 then
    raise exception
      'Cannot publish an empty timetable';
  end if;


  if payload_count > 500 then
    raise exception
      'Timetable payload is unexpectedly large';
  end if;


  -- ----------------------------------------------------------
  -- SERIALIZE PUBLICATION OPERATIONS
  --
  -- Publication is infrequent, so a global transaction-level
  -- advisory lock is deliberately used.
  --
  -- This avoids two simultaneous batch publishes creating
  -- cross-batch faculty/resource races while both versions are
  -- temporarily Draft.
  -- ----------------------------------------------------------

  perform
    pg_catalog.pg_advisory_xact_lock(
      20260919122000
    );


  -- ----------------------------------------------------------
  -- NEXT VERSION
  -- ----------------------------------------------------------

  select
    coalesce(
      max(
        publication.version_number
      ),
      0
    ) + 1
  into
    next_version
  from
    public.timetable_publications publication
  where
    publication.batch_id =
      p_batch_id;


  -- ----------------------------------------------------------
  -- CREATE DRAFT PUBLICATION
  -- ----------------------------------------------------------

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
    next_version,
    'Draft',
    null,
    null,
    caller_id
  )
  returning id
  into new_publication_id;


  -- ----------------------------------------------------------
  -- INSERT EVERY GENERATED PERIOD
  --
  -- Existing triggers enforce:
  --   subject/batch integrity
  --   subgroup/batch collision
  --   faculty collision
  --   active department resource
  --   room/laboratory collision
  -- ----------------------------------------------------------

  for entry in
    select
      value
    from
      jsonb_array_elements(
        p_entries
      )
  loop

    if jsonb_typeof(entry) <>
      'object'
    then
      raise exception
        'Every timetable entry must be an object';
    end if;


    begin
      entry_batch_id :=
        nullif(
          entry ->> 'batch_id',
          ''
        )::uuid;

      entry_subject_id :=
        nullif(
          entry ->> 'batch_subject_id',
          ''
        )::uuid;

      entry_faculty_id :=
        nullif(
          entry ->> 'faculty_id',
          ''
        )::uuid;

      entry_resource_id :=
        nullif(
          entry ->> 'resource_id',
          ''
        )::uuid;

      entry_period_order :=
        nullif(
          entry ->> 'period_order',
          ''
        )::integer;

      entry_start_time :=
        nullif(
          entry ->> 'start_time',
          ''
        )::time;

      entry_end_time :=
        nullif(
          entry ->> 'end_time',
          ''
        )::time;

    exception
      when invalid_text_representation
        or datetime_field_overflow
      then
        raise exception
          'Generated timetable contains an invalid UUID, period or time value';
    end;


    entry_day :=
      trim(
        coalesce(
          entry ->> 'day_of_week',
          ''
        )
      );

    entry_faculty_name :=
      trim(
        coalesce(
          entry ->> 'faculty_name',
          ''
        )
      );

    entry_subgroup :=
      upper(
        trim(
          coalesce(
            entry ->> 'subgroup',
            ''
          )
        )
      );

    entry_room :=
      trim(
        coalesce(
          entry ->> 'room',
          ''
        )
      );

    entry_class_type :=
      trim(
        coalesce(
          entry ->> 'class_type',
          ''
        )
      );


    -- --------------------------------------------------------
    -- REQUIRED VALUES
    -- --------------------------------------------------------

    if entry_batch_id is null
      or entry_subject_id is null
      or entry_faculty_id is null
      or entry_period_order is null
      or entry_start_time is null
      or entry_end_time is null
      or entry_day = ''
    then
      raise exception
        'Generated timetable contains incomplete entry data';
    end if;


    if entry_batch_id <>
      p_batch_id
    then
      raise exception
        'Generated timetable contains an entry for another batch';
    end if;


    if entry_start_time >=
      entry_end_time
    then
      raise exception
        'Generated timetable contains an invalid time range';
    end if;


    if entry_period_order < 1
      or entry_period_order > 20
    then
      raise exception
        'Generated timetable contains an invalid period order';
    end if;


    if entry_day not in (
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ) then
      raise exception
        'Generated timetable contains an invalid working day';
    end if;


    if entry_class_type = '' then
      entry_class_type :=
        'Lecture';
    end if;


    -- --------------------------------------------------------
    -- ENSURE SUBJECT BELONGS TO THIS BATCH
    -- --------------------------------------------------------

    if not exists (
      select 1
      from
        public.attendance_batch_subjects subject
      where
        subject.id =
          entry_subject_id

        and subject.batch_id =
          p_batch_id
    ) then
      raise exception
        'Generated timetable contains a subject from another batch';
    end if;


    -- --------------------------------------------------------
    -- ENSURE FACULTY IS A REAL AUTH USER
    -- --------------------------------------------------------

    if not exists (
      select 1
      from
        auth.users faculty
      where
        faculty.id =
          entry_faculty_id
    ) then
      raise exception
        'Generated timetable contains an invalid faculty account';
    end if;


    -- --------------------------------------------------------
    -- INSERT
    -- --------------------------------------------------------

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
      entry_subject_id,
      entry_faculty_id,
      entry_faculty_name,
      entry_day,
      entry_period_order,
      entry_start_time,
      entry_end_time,
      entry_room,
      entry_class_type,
      'Generated by CampusConnect Timetable Automation',
      caller_id,
      entry_subgroup,
      entry_resource_id,
      new_publication_id
    );


    inserted_count :=
      inserted_count + 1;

  end loop;


  -- ----------------------------------------------------------
  -- DEFENSIVE COUNT CHECK
  -- ----------------------------------------------------------

  if inserted_count <>
    payload_count
  then
    raise exception
      'Timetable publication count mismatch';
  end if;


  -- ----------------------------------------------------------
  -- VERSION SWITCH
  --
  -- The previous publication remains Published until every new
  -- timetable row has inserted successfully.
  -- ----------------------------------------------------------

  update
    public.timetable_publications publication
  set
    status =
      'Superseded'
  where
    publication.batch_id =
      p_batch_id

    and publication.status =
      'Published'

    and publication.id <>
      new_publication_id;


  update
    public.timetable_publications publication
  set
    status =
      'Published',

    published_by =
      caller_id,

    published_at =
      now()
  where
    publication.id =
      new_publication_id;


  -- ----------------------------------------------------------
  -- RETURN RESULT
  -- ----------------------------------------------------------

  return query
  select
    new_publication_id,
    next_version,
    inserted_count;

end;
$function$;


revoke all
on function
public.publish_generated_timetable(
  uuid,
  jsonb
)
from public;


grant execute
on function
public.publish_generated_timetable(
  uuid,
  jsonb
)
to authenticated;


notify pgrst,
  'reload schema';
