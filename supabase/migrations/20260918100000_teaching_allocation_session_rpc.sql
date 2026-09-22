-- ============================================================
-- CAMPUSCONNECT
-- FACULTY TEACHING ALLOCATION SESSION METADATA
--
-- Exposes session_length_periods to the authenticated faculty
-- workload workspace.
-- ============================================================

drop function if exists
  public.get_my_teaching_allocations();


create function
public.get_my_teaching_allocations()
returns table (
  allocation_id uuid,
  batch_id uuid,
  batch_name text,
  section text,
  department text,
  academic_year text,
  batch_subject_id uuid,
  subject_name text,
  subject_code text,
  subject_type text,
  credits integer,
  allocation_type text,
  subgroup text,
  weekly_hours numeric,
  session_length_periods integer,
  is_primary boolean,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,

    b.id,
    b.batch_name,
    b.section,
    b.department,
    b.academic_year,

    s.id,
    s.subject_name,
    s.subject_code,
    s.subject_type,
    s.credits,

    a.allocation_type,
    a.subgroup,
    a.weekly_hours,
    a.session_length_periods,
    a.is_primary,
    a.status

  from
    public.faculty_teaching_allocations a

  join
    public.attendance_batches b
      on b.id = a.batch_id

  join
    public.attendance_batch_subjects s
      on s.id = a.batch_subject_id

  where
    auth.uid() is not null

    and a.faculty_id =
      auth.uid()

    and a.status =
      'Active'

  order by
    lower(b.department),
    lower(b.batch_name),
    lower(b.section),
    lower(s.subject_name),
    lower(a.subgroup);
$$;


revoke all
on function
  public.get_my_teaching_allocations()
from public, anon;


grant execute
on function
  public.get_my_teaching_allocations()
to authenticated;


comment on function
  public.get_my_teaching_allocations()
is
'Returns the authenticated faculty member active teaching allocations including weekly timetable demand and consecutive session length.';


notify pgrst, 'reload schema';
