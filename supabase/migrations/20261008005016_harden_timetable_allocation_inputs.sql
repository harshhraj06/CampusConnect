create or replace function public.assign_faculty_teaching_allocation(
  p_batch_subject_id uuid,
  p_faculty_id uuid,
  p_allocation_type text,
  p_subgroup text default ''::text,
  p_weekly_hours integer default 0,
  p_session_length_periods integer default 1,
  p_is_primary boolean default true,
  p_notes text default ''::text
)
returns table(
  result_allocation_id uuid,
  result_batch_id uuid,
  result_batch_subject_id uuid,
  result_faculty_id uuid,
  result_faculty_name text
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_subject
    public.attendance_batch_subjects%rowtype;

  v_faculty
    public.profiles%rowtype;

  v_allocation_id uuid;
  v_type text;
  v_subgroup text;
  v_session_length integer;
  v_notes text;
begin
  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;

  if public.current_campus_role()
       <> 'Main Admin'
  then
    raise exception
      'Main Admin permission required.';
  end if;

  select subject.*
  into v_subject
  from public.attendance_batch_subjects subject
  where subject.id =
    p_batch_subject_id;

  if not found then
    raise exception
      'Selected batch subject was not found.';
  end if;

  select profile.*
  into v_faculty
  from public.profiles profile
  where
    profile.id =
      p_faculty_id
    and profile.role::text =
      'Faculty'
    and coalesce(
      profile.account_status::text,
      'Active'
    ) = 'Active';

  if not found then
    raise exception
      'Selected account is not an active Faculty account.';
  end if;

  v_type :=
    trim(
      coalesce(
        p_allocation_type,
        ''
      )
    );

  if v_type not in (
    'Theory',
    'Lab',
    'Tutorial',
    'Project',
    'Mentoring'
  ) then
    raise exception
      'Invalid teaching allocation type.';
  end if;

  if
    p_weekly_hours is null
    or p_weekly_hours < 0
    or p_weekly_hours > 60
  then
    raise exception
      'Weekly periods must be between 0 and 60.';
  end if;

  v_session_length :=
    case
      when v_type = 'Lab'
      then p_session_length_periods
      else 1
    end;

  if
    v_session_length is null
    or v_session_length < 1
    or v_session_length > 6
  then
    raise exception
      'Periods per session must be between 1 and 6.';
  end if;

  if
    p_weekly_hours > 0
    and v_session_length >
      p_weekly_hours
  then
    raise exception
      'Periods per session cannot exceed weekly periods.';
  end if;

  if
    p_weekly_hours > 0
    and mod(
      p_weekly_hours,
      v_session_length
    ) <> 0
  then
    raise exception
      'Weekly periods must be divisible by periods per session.';
  end if;

  v_subgroup :=
    case
      when v_type = 'Lab'
      then upper(
        trim(
          coalesce(
            p_subgroup,
            ''
          )
        )
      )
      else ''
    end;

  if
    char_length(v_subgroup) > 40
  then
    raise exception
      'Lab subgroup must be 40 characters or fewer.';
  end if;

  if
    v_type = 'Lab'
    and v_subgroup = ''
  then
    raise exception
      'Lab subgroup is required.';
  end if;

  v_notes :=
    trim(
      coalesce(
        p_notes,
        ''
      )
    );

  if char_length(v_notes) > 2000 then
    raise exception
      'Teaching allocation notes must be 2000 characters or fewer.';
  end if;

  if coalesce(
    p_is_primary,
    false
  ) then
    update
      public.faculty_teaching_allocations allocation
    set
      is_primary = false,
      updated_at = now()
    where
      allocation.batch_subject_id =
        p_batch_subject_id
      and allocation.status =
        'Active'
      and allocation.faculty_id <>
        p_faculty_id;

    update
      public.attendance_batch_subjects subject
    set
      faculty_id =
        v_faculty.id,
      faculty_name =
        v_faculty.full_name,
      updated_at =
        now()
    where
      subject.id =
        p_batch_subject_id;
  end if;

  insert into
    public.faculty_teaching_allocations
      as allocation (
        batch_id,
        batch_subject_id,
        faculty_id,
        faculty_name,
        allocation_type,
        subgroup,
        weekly_hours,
        session_length_periods,
        is_primary,
        status,
        notes,
        created_by,
        updated_at
      )
  values (
    v_subject.batch_id,
    v_subject.id,
    v_faculty.id,
    v_faculty.full_name,
    v_type,
    v_subgroup,
    p_weekly_hours,
    v_session_length,
    coalesce(
      p_is_primary,
      false
    ),
    'Active',
    v_notes,
    auth.uid(),
    now()
  )

  on conflict (
    batch_subject_id,
    faculty_id,
    allocation_type,
    subgroup
  )

  do update
  set
    faculty_name =
      excluded.faculty_name,
    weekly_hours =
      excluded.weekly_hours,
    session_length_periods =
      excluded.session_length_periods,
    is_primary =
      excluded.is_primary,
    status =
      'Active',
    notes =
      excluded.notes,
    updated_at =
      now()

  returning
    allocation.id
  into
    v_allocation_id;

  return query
  select
    v_allocation_id,
    v_subject.batch_id,
    v_subject.id,
    v_faculty.id,
    v_faculty.full_name;
end;
$function$;


create or replace function public.save_timetable_period_slot(
  p_profile_id uuid,
  p_slot_id uuid,
  p_label text,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_is_teaching_slot boolean
)
returns table(
  id uuid,
  profile_id uuid,
  period_order integer,
  label text,
  start_time time without time zone,
  end_time time without time zone,
  is_teaching_slot boolean
)
language plpgsql
security definer
set search_path to
  'pg_catalog',
  'public'
as $function$
declare
  saved_slot_id uuid;
  slot_count integer;
  v_label text;
begin
  if auth.uid() is null then
    raise exception
      'Authentication required';
  end if;

  if coalesce(
    public.current_campus_role(),
    ''
  ) <> 'Main Admin' then
    raise exception
      'Only Main Admin can manage timetable period slots';
  end if;

  if not exists (
    select 1
    from public.timetable_scheduling_profiles profile
    where profile.id =
      p_profile_id
  ) then
    raise exception
      'Scheduling profile does not exist';
  end if;

  v_label :=
    trim(
      coalesce(
        p_label,
        ''
      )
    );

  if v_label = '' then
    raise exception
      'Period label is required';
  end if;

  if char_length(v_label) > 120 then
    raise exception
      'Period label must be 120 characters or fewer';
  end if;

  if
    p_start_time is null
    or p_end_time is null
    or p_end_time <= p_start_time
  then
    raise exception
      'Period end time must be after start time';
  end if;

  perform
    slot.id
  from
    public.timetable_period_slots slot
  where
    slot.profile_id =
      p_profile_id
  for update;

  set constraints
    timetable_period_slots_profile_id_period_order_key
  deferred;

  if p_slot_id is null then
    select
      count(*)
    into
      slot_count
    from
      public.timetable_period_slots slot
    where
      slot.profile_id =
        p_profile_id;

    if slot_count >= 20 then
      raise exception
        'A scheduling profile can contain at most 20 period slots';
    end if;

    insert into
      public.timetable_period_slots (
        profile_id,
        period_order,
        label,
        start_time,
        end_time,
        is_teaching_slot
      )
    values (
      p_profile_id,
      1,
      v_label,
      p_start_time,
      p_end_time,
      coalesce(
        p_is_teaching_slot,
        true
      )
    )
    returning
      timetable_period_slots.id
    into
      saved_slot_id;

  else
    update
      public.timetable_period_slots slot
    set
      label =
        v_label,
      start_time =
        p_start_time,
      end_time =
        p_end_time,
      is_teaching_slot =
        coalesce(
          p_is_teaching_slot,
          true
        )
    where
      slot.id =
        p_slot_id
      and slot.profile_id =
        p_profile_id
    returning
      slot.id
    into
      saved_slot_id;

    if saved_slot_id is null then
      raise exception
        'Period slot does not exist in this scheduling profile';
    end if;
  end if;

  with ranked as (
    select
      slot.id,
      row_number() over (
        order by
          slot.start_time,
          slot.end_time,
          slot.id
      )::integer as chronological_order
    from
      public.timetable_period_slots slot
    where
      slot.profile_id =
        p_profile_id
  )
  update
    public.timetable_period_slots slot
  set
    period_order =
      ranked.chronological_order
  from
    ranked
  where
    slot.id =
      ranked.id;

  return query
  select
    slot.id,
    slot.profile_id,
    slot.period_order,
    slot.label,
    slot.start_time,
    slot.end_time,
    slot.is_teaching_slot
  from
    public.timetable_period_slots slot
  where
    slot.id =
      saved_slot_id;
end;
$function$;


notify pgrst, 'reload schema';
