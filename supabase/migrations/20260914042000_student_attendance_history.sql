create or replace function public.get_my_attendance_history()
returns table (
  session_id uuid,
  subject text,
  attendance_date date,
  period_name text,
  topic text,
  attendance_status text,
  marked_at timestamptz,
  faculty_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id as session_id,
    s.subject,
    s.attendance_date,
    s.period_name,
    s.topic,
    e.attendance_status::text,
    e.marked_at,
    s.faculty_name
  from public.attendance_session_entries e
  join public.attendance_sessions s
    on s.id = e.session_id
  where
    auth.uid() is not null
    and e.student_id = auth.uid()
    and s.status = 'Completed'
  order by
    s.attendance_date desc,
    e.marked_at desc;
$$;

revoke all
on function public.get_my_attendance_history()
from public, anon;

grant execute
on function public.get_my_attendance_history()
to authenticated;

notify pgrst, 'reload schema';
