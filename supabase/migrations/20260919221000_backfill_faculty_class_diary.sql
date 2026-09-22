-- ============================================================
-- CAMPUSCONNECT — BACKFILL FACULTY CLASS DIARY
--
-- Creates diary rows for attendance sessions that existed
-- before Faculty Diary automation was introduced.
--
-- Historical records are marked Manual because the old
-- attendance_sessions table does not retain a reliable
-- published-timetable source reference.
-- ============================================================


insert into public.faculty_class_diary (
  attendance_session_id,
  batch_id,
  batch_subject_id,
  faculty_id,
  faculty_name,
  class_date,
  period_name,
  subject,
  topic,
  present_count,
  absent_count,
  late_count,
  excused_count,
  total_students,
  source,
  created_at,
  updated_at
)

select
  s.id,
  s.batch_id,

  (
    select abs.id
    from public.attendance_batch_subjects abs
    where
      abs.batch_id = s.batch_id
      and lower(trim(abs.subject_name)) =
          lower(trim(s.subject))
    order by abs.created_at asc
    limit 1
  ) as batch_subject_id,

  s.faculty_id,
  s.faculty_name,
  s.attendance_date,
  s.period_name,
  s.subject,
  coalesce(s.topic, ''),

  count(*) filter (
    where e.attendance_status = 'Present'
  )::integer,

  count(*) filter (
    where e.attendance_status = 'Absent'
  )::integer,

  count(*) filter (
    where e.attendance_status = 'Late'
  )::integer,

  count(*) filter (
    where e.attendance_status = 'Excused'
  )::integer,

  count(e.student_id)::integer,

  'Manual',

  s.created_at,
  greatest(
    s.updated_at,
    now()
  )

from public.attendance_sessions s

join public.attendance_session_entries e
  on e.session_id = s.id

where
  s.status = 'Completed'

  and not exists (
    select 1
    from public.faculty_class_diary d
    where
      d.attendance_session_id = s.id
  )

group by
  s.id,
  s.batch_id,
  s.faculty_id,
  s.faculty_name,
  s.attendance_date,
  s.period_name,
  s.subject,
  s.topic,
  s.created_at,
  s.updated_at

on conflict (
  attendance_session_id
)
do nothing;
