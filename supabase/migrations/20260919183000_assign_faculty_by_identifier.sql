-- ============================================================
-- CAMPUSCONNECT
-- Faculty lookup + atomic teaching assignment
--
-- Main Admin only for now.
-- HOD support will be added after secure auth.uid() mapping.
-- ============================================================


create or replace function public.find_faculty_by_identifier(
  p_identifier text
)
returns table (
  id uuid,
  full_name text,
  department text,
  campus_uid text,
  usn text,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_identifier text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if public.current_campus_role() <> 'Main Admin' then
    raise exception 'Main Admin permission required.';
  end if;

  v_identifier :=
    lower(trim(coalesce(p_identifier, '')));

  if v_identifier = '' then
    raise exception 'Enter a CampusConnect CC ID or USN.';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.department,
    p.campus_uid,
    p.usn,
    p.avatar_url
  from public.profiles p
  where p.role = 'Faculty'
    and (
      lower(trim(coalesce(p.campus_uid, ''))) =
        v_identifier
      or
      lower(trim(coalesce(p.usn, ''))) =
        v_identifier
    )
  order by
    case
      when lower(trim(coalesce(p.campus_uid, ''))) =
        v_identifier
      then 0
      else 1
    end,
    p.full_name
  limit 1;
end;
$$;


revoke all
on function public.find_faculty_by_identifier(text)
from public;

grant execute
on function public.find_faculty_by_identifier(text)
to authenticated;



create or replace function public.assign_faculty_teaching_allocation(
  p_batch_subject_id uuid,
  p_faculty_id uuid,
  p_allocation_type text,
  p_subgroup text default '',
  p_weekly_hours integer default 0,
  p_session_length_periods integer default 1,
  p_is_primary boolean default true,
  p_notes text default ''
)
returns table (
  allocation_id uuid,
  batch_id uuid,
  batch_subject_id uuid,
  faculty_id uuid,
  faculty_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject public.attendance_batch_subjects%rowtype;
  v_faculty public.profiles%rowtype;
  v_allocation_id uuid;
  v_type text;
  v_subgroup text;
  v_session_length integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if public.current_campus_role() <> 'Main Admin' then
    raise exception 'Main Admin permission required.';
  end if;


  select *
  into v_subject
  from public.attendance_batch_subjects
  where id = p_batch_subject_id;

  if not found then
    raise exception 'Selected batch subject was not found.';
  end if;


  select *
  into v_faculty
  from public.profiles
  where id = p_faculty_id
    and role = 'Faculty';

  if not found then
    raise exception 'Selected account is not a Faculty account.';
  end if;


  v_type :=
    trim(coalesce(p_allocation_type, ''));

  if v_type not in (
    'Theory',
    'Lab',
    'Tutorial',
    'Project',
    'Mentoring'
  ) then
    raise exception 'Invalid teaching allocation type.';
  end if;


  if p_weekly_hours is null
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


  if v_session_length is null
     or v_session_length < 1
     or v_session_length > 6
  then
    raise exception
      'Periods per session must be between 1 and 6.';
  end if;


  if p_weekly_hours > 0
     and v_session_length > p_weekly_hours
  then
    raise exception
      'Periods per session cannot exceed weekly periods.';
  end if;


  if p_weekly_hours > 0
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


  if v_type = 'Lab'
     and v_subgroup = ''
  then
    raise exception
      'Lab subgroup is required.';
  end if;


  /*
   * One primary teaching owner for a subject.
   */
  if coalesce(
    p_is_primary,
    false
  ) then

    update public.faculty_teaching_allocations
    set
      is_primary = false,
      updated_at = now()
    where batch_subject_id =
      p_batch_subject_id
      and status = 'Active'
      and faculty_id <> p_faculty_id;


    /*
     * Keep the legacy/direct subject assignment aligned
     * with the primary teaching allocation.
     *
     * This matters because some existing Faculty Attendance
     * code still reads attendance_batch_subjects.faculty_id.
     */
    update public.attendance_batch_subjects
    set
      faculty_id =
        v_faculty.id,
      faculty_name =
        v_faculty.full_name,
      updated_at =
        now()
    where id =
      p_batch_subject_id;

  end if;


  insert into public.faculty_teaching_allocations (
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
    trim(
      coalesce(
        p_notes,
        ''
      )
    ),
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
  returning id
  into v_allocation_id;


  return query
  select
    v_allocation_id,
    v_subject.batch_id,
    v_subject.id,
    v_faculty.id,
    v_faculty.full_name;
end;
$$;


revoke all
on function public.assign_faculty_teaching_allocation(
  uuid,
  uuid,
  text,
  text,
  integer,
  integer,
  boolean,
  text
)
from public;

grant execute
on function public.assign_faculty_teaching_allocation(
  uuid,
  uuid,
  text,
  text,
  integer,
  integer,
  boolean,
  text
)
to authenticated;
