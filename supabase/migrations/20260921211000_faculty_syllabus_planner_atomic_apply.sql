-- ============================================================
-- CAMPUSCONNECT — SMART SYLLABUS PLANNER
-- ATOMIC APPLY TRANSACTION
--
-- Safety guarantees:
--
-- 1. Faculty must have access to the selected batch subject.
-- 2. Entire payload is validated before replacement.
-- 3. Existing syllabus is never replaced silently.
-- 4. A syllabus with Faculty Diary progress can NEVER be
--    replaced by this RPC.
-- 5. Every topic must receive >= 1 teaching class.
-- 6. Sum(planned_periods) must exactly equal semester capacity.
-- 7. Units + topics + planner config are committed atomically.
-- 8. Existing matching Faculty Diary rows are backfilled after
--    syllabus creation.
-- ============================================================


-- ============================================================
-- READ-ONLY APPLY STATUS
--
-- Used by the UI before asking the faculty to confirm an
-- existing syllabus replacement.
-- ============================================================

create or replace function
public.get_faculty_syllabus_apply_status(
  p_batch_subject_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_user_id uuid;

  v_role text;

  v_unit_count integer := 0;

  v_topic_count integer := 0;

  v_completion_count integer := 0;

begin

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
  then
    raise exception
      'Authentication required.';
  end if;


  v_role :=
    public.current_campus_role();


  if
    v_role not in (
      'Faculty',
      'Main Admin'
    )
  then
    raise exception
      'Only Faculty or Main Admin can manage syllabus plans.';
  end if;


  if not
    public.can_access_assigned_batch_subject(
      p_batch_subject_id
    )
  then
    raise exception
      'You do not have access to this assigned subject.';
  end if;


  select
    count(*)::integer
  into
    v_unit_count
  from
    public.faculty_syllabus_units
  where
    batch_subject_id =
      p_batch_subject_id;


  select
    count(*)::integer
  into
    v_topic_count
  from
    public.faculty_syllabus_topics
  where
    batch_subject_id =
      p_batch_subject_id;


  select
    count(*)::integer
  into
    v_completion_count
  from
    public.faculty_syllabus_topic_completions
  where
    batch_subject_id =
      p_batch_subject_id;


  return
    jsonb_build_object(

      'batchSubjectId',
        p_batch_subject_id,

      'existingUnits',
        v_unit_count,

      'existingTopics',
        v_topic_count,

      'completionEvents',
        v_completion_count,

      'hasExistingSyllabus',
        (
          v_unit_count > 0
          or
          v_topic_count > 0
        ),

      'hasProgress',
        v_completion_count > 0,

      'replacementAllowed',
        v_completion_count = 0

    );

end;
$$;


revoke all
on function
public.get_faculty_syllabus_apply_status(
  uuid
)
from public;


revoke all
on function
public.get_faculty_syllabus_apply_status(
  uuid
)
from anon;


grant execute
on function
public.get_faculty_syllabus_apply_status(
  uuid
)
to authenticated;



-- ============================================================
-- ATOMIC APPLY RPC
--
-- Expected p_units structure:
--
-- [
--   {
--     "unitNumber": 1,
--     "title": "Unit title",
--     "description": "",
--     "topics": [
--       {
--         "topicOrder": 1,
--         "title": "Topic title",
--         "description": "",
--         "plannedClasses": 2
--       }
--     ]
--   }
-- ]
-- ============================================================

create or replace function
public.apply_faculty_syllabus_plan(

  p_batch_subject_id uuid,

  p_units jsonb,

  p_weekly_sessions numeric,

  p_teaching_weeks integer,

  p_total_planned_classes integer,

  p_replace_existing boolean
    default false

)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_user_id uuid;

  v_role text;

  v_expected_total integer;

  v_unit_count integer;

  v_topic_count integer := 0;

  v_planned_total integer := 0;


  v_existing_units integer := 0;

  v_existing_topics integer := 0;

  v_existing_completions integer := 0;


  v_inserted_units integer := 0;

  v_inserted_topics integer := 0;

  v_backfilled_completions integer := 0;


  v_unit jsonb;

  v_topic jsonb;


  v_unit_number integer;

  v_expected_unit_number integer := 1;


  v_topic_order integer;

  v_expected_topic_order integer;


  v_planned_classes integer;


  v_unit_title text;

  v_unit_description text;


  v_topic_title text;

  v_topic_description text;

  v_normalized_topic_title text;


  v_seen_topic_titles text[]
    := array[]::text[];


  v_unit_id uuid;

begin

  -- ==========================================================
  -- AUTHENTICATION + AUTHORIZATION
  -- ==========================================================

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
  then
    raise exception
      'Authentication required.';
  end if;


  v_role :=
    public.current_campus_role();


  if
    v_role not in (
      'Faculty',
      'Main Admin'
    )
  then
    raise exception
      'Only Faculty or Main Admin can apply syllabus plans.';
  end if;


  if
    p_batch_subject_id is null
  then
    raise exception
      'A batch subject is required.';
  end if;


  if not
    public.can_access_assigned_batch_subject(
      p_batch_subject_id
    )
  then
    raise exception
      'You do not have access to this assigned subject.';
  end if;


  -- Lock the concrete subject row so two simultaneous planner
  -- saves cannot replace the same syllabus concurrently.

  perform
    1
  from
    public.attendance_batch_subjects
  where
    id =
      p_batch_subject_id
  for update;


  if not found
  then
    raise exception
      'The assigned subject no longer exists.';
  end if;


  -- ==========================================================
  -- CAPACITY VALIDATION
  -- ==========================================================

  if
    p_weekly_sessions is null
    or
    p_weekly_sessions <= 0
    or
    p_weekly_sessions > 60
  then
    raise exception
      'Weekly teaching sessions must be between 1 and 60.';
  end if;


  if
    p_teaching_weeks is null
    or
    p_teaching_weeks < 1
    or
    p_teaching_weeks > 60
  then
    raise exception
      'Teaching weeks must be between 1 and 60.';
  end if;


  v_expected_total :=
    floor(
      p_weekly_sessions *
      p_teaching_weeks
    )::integer;


  if
    v_expected_total < 1
    or
    v_expected_total > 1000
  then
    raise exception
      'Calculated teaching capacity must be between 1 and 1000 classes.';
  end if;


  if
    p_total_planned_classes is null
    or
    p_total_planned_classes < 1
    or
    p_total_planned_classes > 1000
  then
    raise exception
      'Total planned classes must be between 1 and 1000.';
  end if;


  if
    p_total_planned_classes <>
    v_expected_total
  then
    raise exception
      'Teaching capacity changed. Regenerate the syllabus plan before saving.';
  end if;


  -- ==========================================================
  -- PAYLOAD VALIDATION
  -- ==========================================================

  if
    p_units is null
    or
    jsonb_typeof(
      p_units
    ) <> 'array'
  then
    raise exception
      'Syllabus units must be provided as an array.';
  end if;


  v_unit_count :=
    jsonb_array_length(
      p_units
    );


  if
    v_unit_count < 1
    or
    v_unit_count > 40
  then
    raise exception
      'A syllabus must contain between 1 and 40 units.';
  end if;


  for
    v_unit
  in
    select
      value
    from
      jsonb_array_elements(
        p_units
      )
  loop

    if
      jsonb_typeof(
        v_unit
      ) <> 'object'
    then
      raise exception
        'Every syllabus unit must be an object.';
    end if;


    if
      coalesce(
        v_unit ->> 'unitNumber',
        ''
      ) !~ '^[0-9]+$'
    then
      raise exception
        'Every syllabus unit must have a valid unit number.';
    end if;


    v_unit_number :=
      (
        v_unit ->>
        'unitNumber'
      )::integer;


    if
      v_unit_number <>
      v_expected_unit_number
    then
      raise exception
        'Syllabus unit numbers must be sequential starting from 1.';
    end if;


    v_unit_title :=
      btrim(
        coalesce(
          v_unit ->> 'title',
          ''
        )
      );


    if
      char_length(
        v_unit_title
      ) < 1
      or
      char_length(
        v_unit_title
      ) > 240
    then
      raise exception
        'Every unit title must contain between 1 and 240 characters.';
    end if;


    if
      not (
        v_unit ? 'topics'
      )
      or
      jsonb_typeof(
        v_unit -> 'topics'
      ) <> 'array'
    then
      raise exception
        'Every syllabus unit must contain a topics array.';
    end if;


    if
      jsonb_array_length(
        v_unit -> 'topics'
      ) < 1
    then
      raise exception
        'Every syllabus unit must contain at least one topic.';
    end if;


    if
      jsonb_array_length(
        v_unit -> 'topics'
      ) > 100
    then
      raise exception
        'A syllabus unit cannot contain more than 100 topics.';
    end if;


    v_expected_topic_order :=
      1;


    for
      v_topic
    in
      select
        value
      from
        jsonb_array_elements(
          v_unit -> 'topics'
        )
    loop

      if
        jsonb_typeof(
          v_topic
        ) <> 'object'
      then
        raise exception
          'Every syllabus topic must be an object.';
      end if;


      if
        coalesce(
          v_topic ->> 'topicOrder',
          ''
        ) !~ '^[0-9]+$'
      then
        raise exception
          'Every syllabus topic must have a valid topic order.';
      end if;


      v_topic_order :=
        (
          v_topic ->>
          'topicOrder'
        )::integer;


      if
        v_topic_order <>
        v_expected_topic_order
      then
        raise exception
          'Topic order must be sequential inside every unit.';
      end if;


      v_topic_title :=
        btrim(
          coalesce(
            v_topic ->> 'title',
            ''
          )
        );


      if
        char_length(
          v_topic_title
        ) < 1
        or
        char_length(
          v_topic_title
        ) > 240
      then
        raise exception
          'Every topic title must contain between 1 and 240 characters.';
      end if;


      /*
       * Diary -> syllabus progress matching uses topic text.
       * Duplicate topic titles inside one subject would therefore
       * make automatic matching ambiguous.
       */

      v_normalized_topic_title :=
        lower(
          regexp_replace(
            v_topic_title,
            '\s+',
            ' ',
            'g'
          )
        );


      if
        v_normalized_topic_title =
        any(
          v_seen_topic_titles
        )
      then
        raise exception
          'Duplicate topic title detected: "%". Topic titles must be unique within this subject.',
          v_topic_title;
      end if;


      v_seen_topic_titles :=
        array_append(
          v_seen_topic_titles,
          v_normalized_topic_title
        );


      if
        coalesce(
          v_topic ->> 'plannedClasses',
          ''
        ) !~ '^[0-9]+$'
      then
        raise exception
          'Every topic must have a valid planned class count.';
      end if;


      v_planned_classes :=
        (
          v_topic ->>
          'plannedClasses'
        )::integer;


      /*
       * faculty_syllabus_topics.planned_periods has a > 0
       * database constraint. Zero-class topics cannot be saved.
       */

      if
        v_planned_classes < 1
        or
        v_planned_classes > 1000
      then
        raise exception
          'Every syllabus topic must receive between 1 and 1000 teaching classes.';
      end if;


      v_topic_count :=
        v_topic_count +
        1;


      if
        v_topic_count > 300
      then
        raise exception
          'A syllabus cannot contain more than 300 topics.';
      end if;


      v_planned_total :=
        v_planned_total +
        v_planned_classes;


      v_expected_topic_order :=
        v_expected_topic_order +
        1;

    end loop;


    v_expected_unit_number :=
      v_expected_unit_number +
      1;

  end loop;


  if
    v_topic_count < 1
  then
    raise exception
      'The syllabus must contain at least one topic.';
  end if;


  if
    v_planned_total <>
    p_total_planned_classes
  then
    raise exception
      'Allocated topic classes (%) do not equal available teaching classes (%). Rebalance the plan before saving.',
      v_planned_total,
      p_total_planned_classes;
  end if;


  -- ==========================================================
  -- PROTECT EXISTING SYLLABUS + DIARY HISTORY
  -- ==========================================================


  -- ==========================================================
  -- LOCK EXISTING SYLLABUS ROWS AGAINST CONCURRENT DIARY SYNC
  --
  -- faculty_syllabus_topic_completions references topic_id.
  -- Taking row locks on the current topics prevents a new
  -- completion event from racing with syllabus replacement.
  -- ==========================================================

  perform
    1
  from
    public.faculty_syllabus_units
  where
    batch_subject_id =
      p_batch_subject_id
  for update;


  perform
    1
  from
    public.faculty_syllabus_topics
  where
    batch_subject_id =
      p_batch_subject_id
  for update;


  select
    count(*)::integer
  into
    v_existing_units
  from
    public.faculty_syllabus_units
  where
    batch_subject_id =
      p_batch_subject_id;


  select
    count(*)::integer
  into
    v_existing_topics
  from
    public.faculty_syllabus_topics
  where
    batch_subject_id =
      p_batch_subject_id;


  select
    count(*)::integer
  into
    v_existing_completions
  from
    public.faculty_syllabus_topic_completions
  where
    batch_subject_id =
      p_batch_subject_id;


  /*
   * NEVER cascade-delete existing Faculty Diary coverage.
   * Replacement is completely blocked once progress exists.
   */

  if
    v_existing_completions > 0
  then
    raise exception
      'This syllabus already has Faculty Diary progress. Smart replacement is blocked to protect teaching history.';
  end if;


  if
    (
      v_existing_units > 0
      or
      v_existing_topics > 0
    )
    and
    not p_replace_existing
  then
    raise exception
      'An existing syllabus already exists. Explicit replacement confirmation is required.';
  end if;


  -- ==========================================================
  -- REMOVE OLD SYLLABUS ONLY AFTER ALL VALIDATION PASSES
  -- ==========================================================

  if
    p_replace_existing
    and
    (
      v_existing_units > 0
      or
      v_existing_topics > 0
    )
  then

    delete from
      public.faculty_syllabus_units
    where
      batch_subject_id =
        p_batch_subject_id;

  end if;


  -- ==========================================================
  -- INSERT APPROVED UNITS + TOPICS
  -- ==========================================================

  for
    v_unit
  in
    select
      value
    from
      jsonb_array_elements(
        p_units
      )
  loop

    v_unit_number :=
      (
        v_unit ->>
        'unitNumber'
      )::integer;


    v_unit_title :=
      btrim(
        v_unit ->>
        'title'
      );


    v_unit_description :=
      left(
        coalesce(
          v_unit ->> 'description',
          ''
        ),
        4000
      );


    insert into
    public.faculty_syllabus_units (

      batch_subject_id,

      unit_number,

      unit_title,

      description,

      created_by

    )
    values (

      p_batch_subject_id,

      v_unit_number,

      v_unit_title,

      v_unit_description,

      v_user_id

    )
    returning
      id
    into
      v_unit_id;


    v_inserted_units :=
      v_inserted_units +
      1;


    for
      v_topic
    in
      select
        value
      from
        jsonb_array_elements(
          v_unit -> 'topics'
        )
    loop

      v_topic_order :=
        (
          v_topic ->>
          'topicOrder'
        )::integer;


      v_topic_title :=
        btrim(
          v_topic ->>
          'title'
        );


      v_topic_description :=
        left(
          coalesce(
            v_topic ->> 'description',
            ''
          ),
          4000
        );


      v_planned_classes :=
        (
          v_topic ->>
          'plannedClasses'
        )::integer;


      insert into
      public.faculty_syllabus_topics (

        unit_id,

        batch_subject_id,

        topic_order,

        topic_title,

        description,

        planned_periods,

        created_by

      )
      values (

        v_unit_id,

        p_batch_subject_id,

        v_topic_order,

        v_topic_title,

        v_topic_description,

        v_planned_classes,

        v_user_id

      );


      v_inserted_topics :=
        v_inserted_topics +
        1;

    end loop;

  end loop;


  -- ==========================================================
  -- SAVE CURRENT PLANNER CONFIGURATION
  -- ==========================================================

  insert into
  public.faculty_syllabus_plans (

    batch_subject_id,

    weekly_sessions,

    teaching_weeks,

    total_planned_classes,

    status,

    planning_method,

    created_by,

    updated_by

  )
  values (

    p_batch_subject_id,

    p_weekly_sessions,

    p_teaching_weeks,

    p_total_planned_classes,

    'Applied',

    'AI Assisted',

    v_user_id,

    v_user_id

  )

  on conflict (
    batch_subject_id
  )
  do update
  set

    weekly_sessions =
      excluded.weekly_sessions,

    teaching_weeks =
      excluded.teaching_weeks,

    total_planned_classes =
      excluded.total_planned_classes,

    status =
      'Applied',

    planning_method =
      'AI Assisted',

    updated_by =
      excluded.updated_by,

    updated_at =
      now();


  -- ==========================================================
  -- BACKFILL EXISTING FACULTY DIARY CLASSES
  --
  -- Example:
  -- Faculty taught "Sampling Theorem" before uploading the
  -- official syllabus. Once the approved topic exists, that
  -- existing diary class should count toward progress.
  -- ==========================================================

  insert into
  public.faculty_syllabus_topic_completions (

    topic_id,

    batch_subject_id,

    diary_id,

    faculty_id,

    completed_at

  )

  select

    topic.id,

    diary.batch_subject_id,

    diary.id,

    diary.faculty_id,

    diary.class_date::timestamptz

  from
    public.faculty_class_diary diary

  join
    public.faculty_syllabus_topics topic

    on
      topic.batch_subject_id =
        diary.batch_subject_id

    and
      lower(
        btrim(
          topic.topic_title
        )
      ) =
      lower(
        btrim(
          diary.topic
        )
      )

  where
    diary.batch_subject_id =
      p_batch_subject_id

    and
    btrim(
      coalesce(
        diary.topic,
        ''
      )
    ) <> ''

  on conflict (
    diary_id,
    topic_id
  )
  do nothing;


  get diagnostics
    v_backfilled_completions =
      row_count;


  -- ==========================================================
  -- RESULT
  -- ==========================================================

  return
    jsonb_build_object(

      'success',
        true,

      'batchSubjectId',
        p_batch_subject_id,

      'unitsInserted',
        v_inserted_units,

      'topicsInserted',
        v_inserted_topics,

      'weeklySessions',
        p_weekly_sessions,

      'teachingWeeks',
        p_teaching_weeks,

      'totalPlannedClasses',
        p_total_planned_classes,

      'backfilledCompletionEvents',
        v_backfilled_completions,

      'replacedExistingSyllabus',
        (
          p_replace_existing
          and
          (
            v_existing_units > 0
            or
            v_existing_topics > 0
          )
        )

    );

end;
$$;


revoke all
on function
public.apply_faculty_syllabus_plan(
  uuid,
  jsonb,
  numeric,
  integer,
  integer,
  boolean
)
from public;


revoke all
on function
public.apply_faculty_syllabus_plan(
  uuid,
  jsonb,
  numeric,
  integer,
  integer,
  boolean
)
from anon;


grant execute
on function
public.apply_faculty_syllabus_plan(
  uuid,
  jsonb,
  numeric,
  integer,
  integer,
  boolean
)
to authenticated;


notify pgrst, 'reload schema';
