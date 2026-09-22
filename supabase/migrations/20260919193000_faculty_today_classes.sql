-- ============================================================
-- CAMPUSCONNECT
-- FACULTY TODAY'S CLASSES
--
-- Returns only:
--   • authenticated Faculty member's own timetable entries
--   • entries belonging to Published timetable versions
--   • requested weekday
--
-- Superseded and Draft publications are excluded.
-- ============================================================

create or replace function
public.get_my_faculty_today_classes(
  p_day_of_week text
)
returns table (
  entry_id uuid,
  publication_id uuid,
  version_number integer,

  batch_id uuid,
  batch_name text,
  section text,
  department text,
  academic_year text,
  semester text,

  batch_subject_id uuid,
  subject_name text,
  subject_code text,
  subject_type text,

  faculty_id uuid,
  faculty_name text,

  day_of_week text,
  period_order integer,
  start_time time without time zone,
  end_time time without time zone,

  room text,
  class_type text,
  subgroup text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_day text;
begin

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  if public.current_campus_role()
       <> 'Faculty'
  then
    raise exception
      'Faculty permission required.';
  end if;


  v_day :=
    initcap(
      lower(
        trim(
          coalesce(
            p_day_of_week,
            ''
          )
        )
      )
    );


  if v_day not in (
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ) then
    raise exception
      'Invalid weekday.';
  end if;


  return query

  select
    e.id,
    e.publication_id,
    publication.version_number,

    batch.id,
    batch.batch_name,
    batch.section,
    batch.department,
    batch.academic_year,
    batch.semester,

    subject.id,
    subject.subject_name,
    subject.subject_code,
    subject.subject_type,

    e.faculty_id,
    e.faculty_name,

    e.day_of_week,
    e.period_order,
    e.start_time,
    e.end_time,

    e.room,
    e.class_type,
    e.subgroup

  from public.batch_timetable_entries
    as e

  join public.timetable_publications
    as publication
    on publication.id =
      e.publication_id

  join public.attendance_batches
    as batch
    on batch.id =
      e.batch_id

  join public.attendance_batch_subjects
    as subject
    on subject.id =
      e.batch_subject_id

  where
    publication.status =
      'Published'

    and e.faculty_id =
      auth.uid()

    and e.day_of_week =
      v_day

  order by
    e.start_time,
    e.period_order,
    batch.batch_name,
    subject.subject_code;

end;
$$;


revoke all
on function
public.get_my_faculty_today_classes(text)
from public;


grant execute
on function
public.get_my_faculty_today_classes(text)
to authenticated;
