create or replace function public.get_my_live_attendance_summary()
returns table (
  subject text,
  classes_conducted bigint,
  counted_classes bigint,
  attended_classes bigint,
  present_count bigint,
  absent_count bigint,
  late_count bigint,
  excused_count bigint,
  attendance_percentage numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with student_entries as (
    select
      regexp_replace(
        lower(trim(s.subject)),
        '\s+',
        ' ',
        'g'
      ) as subject_key,

      trim(s.subject) as display_subject,

      e.session_id,
      e.attendance_status

    from public.attendance_session_entries e

    join public.attendance_sessions s
      on s.id = e.session_id

    where
      auth.uid() is not null
      and e.student_id = auth.uid()
      and s.status = 'Completed'
  ),

  aggregated as (
    select
      subject_key,

      min(display_subject) as subject,

      count(
        distinct session_id
      )::bigint
        as classes_conducted,

      count(
        distinct session_id
      ) filter (
        where attendance_status <> 'Excused'
      )::bigint
        as counted_classes,

      count(
        distinct session_id
      ) filter (
        where attendance_status in (
          'Present',
          'Late'
        )
      )::bigint
        as attended_classes,

      count(
        distinct session_id
      ) filter (
        where attendance_status = 'Present'
      )::bigint
        as present_count,

      count(
        distinct session_id
      ) filter (
        where attendance_status = 'Absent'
      )::bigint
        as absent_count,

      count(
        distinct session_id
      ) filter (
        where attendance_status = 'Late'
      )::bigint
        as late_count,

      count(
        distinct session_id
      ) filter (
        where attendance_status = 'Excused'
      )::bigint
        as excused_count

    from student_entries

    group by
      subject_key
  )

  select
    a.subject,
    a.classes_conducted,
    a.counted_classes,
    a.attended_classes,
    a.present_count,
    a.absent_count,
    a.late_count,
    a.excused_count,

    case
      when a.counted_classes = 0
        then 0::numeric

      else round(
        (
          a.attended_classes::numeric
          /
          a.counted_classes::numeric
        ) * 100,
        1
      )
    end
      as attendance_percentage

  from aggregated a

  order by
    lower(a.subject);
$$;

revoke all
on function public.get_my_live_attendance_summary()
from public, anon;

grant execute
on function public.get_my_live_attendance_summary()
to authenticated;

notify pgrst, 'reload schema';
