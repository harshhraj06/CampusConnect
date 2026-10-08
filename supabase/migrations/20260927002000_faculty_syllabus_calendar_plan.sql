-- ============================================================
-- CAMPUSCONNECT
-- DATED FACULTY SYLLABUS CALENDAR PLAN
-- ============================================================

create table if not exists
public.faculty_syllabus_calendar_plan (

  id uuid primary key
    default gen_random_uuid(),

  batch_subject_id uuid not null
    references public.attendance_batch_subjects(id)
    on delete cascade,

  faculty_id uuid not null
    references auth.users(id)
    on delete cascade,

  class_date date not null,

  day_of_week text not null
    default '',

  period_order integer,

  start_time time,

  end_time time,

  room text not null
    default '',

  extra_class boolean not null
    default false,

  unit_number integer not null
    check (
      unit_number > 0
    ),

  unit_title text not null
    default '',

  topic_order integer not null
    check (
      topic_order > 0
    ),

  topic_title text not null,

  lesson_number integer not null
    check (
      lesson_number > 0
    ),

  status text not null
    default 'Planned'
    check (
      status in (
        'Planned',
        'Completed',
        'Skipped'
      )
    ),

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique (
    batch_subject_id,
    lesson_number
  )
);


create index if not exists
faculty_syllabus_calendar_plan_subject_date_idx
on public.faculty_syllabus_calendar_plan (
  batch_subject_id,
  class_date,
  period_order
);


create index if not exists
faculty_syllabus_calendar_plan_faculty_idx
on public.faculty_syllabus_calendar_plan (
  faculty_id,
  class_date
);


alter table
public.faculty_syllabus_calendar_plan
enable row level security;


drop policy if exists
faculty_syllabus_calendar_plan_select
on public.faculty_syllabus_calendar_plan;


create policy
faculty_syllabus_calendar_plan_select
on public.faculty_syllabus_calendar_plan
for select
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


drop policy if exists
faculty_syllabus_calendar_plan_insert
on public.faculty_syllabus_calendar_plan;


create policy
faculty_syllabus_calendar_plan_insert
on public.faculty_syllabus_calendar_plan
for insert
to authenticated
with check (
  (
    faculty_id =
      auth.uid()
    or
    public.current_campus_role() =
      'Main Admin'
  )
  and
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


drop policy if exists
faculty_syllabus_calendar_plan_update
on public.faculty_syllabus_calendar_plan;


create policy
faculty_syllabus_calendar_plan_update
on public.faculty_syllabus_calendar_plan
for update
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
)
with check (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


drop policy if exists
faculty_syllabus_calendar_plan_delete
on public.faculty_syllabus_calendar_plan;


create policy
faculty_syllabus_calendar_plan_delete
on public.faculty_syllabus_calendar_plan
for delete
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


create or replace function
public.save_faculty_syllabus_calendar_plan(

  p_batch_subject_id uuid,

  p_start_date date,

  p_end_date date,

  p_weekly_periods integer,

  p_teaching_weeks integer,

  p_rows jsonb

)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_user_id uuid;

  v_role text;

  v_row jsonb;

  v_count integer := 0;

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
      'Only Faculty or Main Admin can save syllabus plans.';
  end if;


  if not
    public.can_access_assigned_batch_subject(
      p_batch_subject_id
    )
  then
    raise exception
      'You do not have access to this assigned subject.';
  end if;


  if
    p_start_date is null
    or
    p_end_date is null
    or
    p_end_date <
      p_start_date
  then
    raise exception
      'Invalid semester date range.';
  end if;


  if
    p_weekly_periods is null
    or
    p_weekly_periods < 1
    or
    p_weekly_periods > 60
  then
    raise exception
      'Weekly timetable periods must be between 1 and 60.';
  end if;


  if
    p_rows is null
    or
    jsonb_typeof(
      p_rows
    ) <> 'array'
    or
    jsonb_array_length(
      p_rows
    ) < 1
  then
    raise exception
      'The teaching schedule is empty.';
  end if;


  if
    jsonb_array_length(
      p_rows
    ) > 1000
  then
    raise exception
      'The teaching schedule is too large.';
  end if;


  delete from
    public.faculty_syllabus_calendar_plan
  where
    batch_subject_id =
      p_batch_subject_id;


  for
    v_row
  in
    select
      value
    from
      jsonb_array_elements(
        p_rows
      )
  loop

    if
      nullif(
        trim(
          coalesce(
            v_row ->
              'classDate' #>>
              '{}',
            ''
          )
        ),
        ''
      ) is null
    then
      raise exception
        'Every teaching class requires a date.';
    end if;


    if
      nullif(
        trim(
          coalesce(
            v_row ->
              'topicTitle' #>>
              '{}',
            ''
          )
        ),
        ''
      ) is null
    then
      raise exception
        'Every teaching class requires a lesson.';
    end if;


    insert into
    public.faculty_syllabus_calendar_plan (
      batch_subject_id,
      faculty_id,
      class_date,
      day_of_week,
      period_order,
      start_time,
      end_time,
      room,
      extra_class,
      unit_number,
      unit_title,
      topic_order,
      topic_title,
      lesson_number
    )
    values (
      p_batch_subject_id,

      v_user_id,

      (
        v_row ->
          'classDate' #>>
          '{}'
      )::date,

      left(
        coalesce(
          v_row ->
            'dayOfWeek' #>>
            '{}',
          ''
        ),
        20
      ),

      nullif(
        v_row ->
          'periodOrder' #>>
          '{}',
        ''
      )::integer,

      nullif(
        v_row ->
          'startTime' #>>
          '{}',
        ''
      )::time,

      nullif(
        v_row ->
          'endTime' #>>
          '{}',
        ''
      )::time,

      left(
        coalesce(
          v_row ->
            'room' #>>
            '{}',
          ''
        ),
        120
      ),

      coalesce(
        (
          v_row ->
            'extraClass' #>>
            '{}'
        )::boolean,
        false
      ),

      (
        v_row ->
          'unitNumber' #>>
          '{}'
      )::integer,

      left(
        coalesce(
          v_row ->
            'unitTitle' #>>
            '{}',
          ''
        ),
        240
      ),

      (
        v_row ->
          'topicOrder' #>>
          '{}'
      )::integer,

      left(
        coalesce(
          v_row ->
            'topicTitle' #>>
            '{}',
          ''
        ),
        240
      ),

      (
        v_row ->
          'lessonNumber' #>>
          '{}'
      )::integer
    );


    v_count :=
      v_count +
      1;

  end loop;


  update
    public.faculty_syllabus_plans
  set
    weekly_sessions =
      greatest(
        1,
        least(
          60,
          p_weekly_periods
        )
      ),

    teaching_weeks =
      greatest(
        1,
        least(
          60,
          coalesce(
            p_teaching_weeks,
            1
          )
        )
      ),

    total_planned_classes =
      v_count,

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    batch_subject_id =
      p_batch_subject_id;


  return
    jsonb_build_object(
      'success',
        true,

      'savedRows',
        v_count,

      'startDate',
        p_start_date,

      'endDate',
        p_end_date,

      'weeklyPeriods',
        p_weekly_periods
    );

end;
$$;


revoke all
on function
public.save_faculty_syllabus_calendar_plan(
  uuid,
  date,
  date,
  integer,
  integer,
  jsonb
)
from public;


revoke all
on function
public.save_faculty_syllabus_calendar_plan(
  uuid,
  date,
  date,
  integer,
  integer,
  jsonb
)
from anon;


grant execute
on function
public.save_faculty_syllabus_calendar_plan(
  uuid,
  date,
  date,
  integer,
  integer,
  jsonb
)
to authenticated;


grant
  select,
  insert,
  update,
  delete
on
public.faculty_syllabus_calendar_plan
to authenticated;


notify pgrst,
  'reload schema';
