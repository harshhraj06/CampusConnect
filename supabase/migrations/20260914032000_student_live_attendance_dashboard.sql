create or replace function public.get_my_attendance_batches()
returns table (
  batch_id uuid,
  batch_name text,
  section text,
  department text,
  academic_year text,
  semester text,
  total_students integer,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    b.batch_name,
    b.section,
    b.department,
    b.academic_year,
    b.semester,
    b.total_students,
    bs.added_at
  from public.attendance_batch_students bs
  join public.attendance_batches b
    on b.id = bs.batch_id
  where
    auth.uid() is not null
    and bs.student_id = auth.uid()
  order by bs.added_at desc;
$$;


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
  select
    s.subject,

    count(*)::bigint
      as classes_conducted,

    count(*) filter (
      where e.attendance_status <> 'Excused'
    )::bigint
      as counted_classes,

    count(*) filter (
      where e.attendance_status in (
        'Present',
        'Late'
      )
    )::bigint
      as attended_classes,

    count(*) filter (
      where e.attendance_status = 'Present'
    )::bigint
      as present_count,

    count(*) filter (
      where e.attendance_status = 'Absent'
    )::bigint
      as absent_count,

    count(*) filter (
      where e.attendance_status = 'Late'
    )::bigint
      as late_count,

    count(*) filter (
      where e.attendance_status = 'Excused'
    )::bigint
      as excused_count,

    case
      when count(*) filter (
        where e.attendance_status <> 'Excused'
      ) = 0
      then 0::numeric

      else round(
        (
          count(*) filter (
            where e.attendance_status in (
              'Present',
              'Late'
            )
          )::numeric
          /
          count(*) filter (
            where e.attendance_status <> 'Excused'
          )::numeric
        ) * 100,
        1
      )
    end
      as attendance_percentage

  from public.attendance_session_entries e

  join public.attendance_sessions s
    on s.id = e.session_id

  where
    auth.uid() is not null

    and e.student_id =
      auth.uid()

    and s.status =
      'Completed'

  group by
    s.subject

  order by
    lower(s.subject);
$$;


revoke all
on function public.get_my_attendance_batches()
from public, anon;

revoke all
on function public.get_my_live_attendance_summary()
from public, anon;


grant execute
on function public.get_my_attendance_batches()
to authenticated;

grant execute
on function public.get_my_live_attendance_summary()
to authenticated;


notify pgrst, 'reload schema';
