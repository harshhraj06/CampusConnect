-- ============================================================
-- CAMPUSCONNECT
-- FACULTY ALLOCATION SESSION LENGTH
--
-- weekly_hours:
--   total timetable periods required per week
--
-- session_length_periods:
--   number of consecutive teaching periods that form one
--   scheduling session
--
-- Examples:
--
--   weekly_hours = 3
--   session_length_periods = 1
--   => 3 independent sessions
--
--   weekly_hours = 4
--   session_length_periods = 2
--   => 2 sessions, each 2 consecutive periods
--
-- Existing allocations deliberately default to 1.
-- No legacy lab allocation is reinterpreted automatically.
-- ============================================================


alter table
  public.faculty_teaching_allocations
add column if not exists
  session_length_periods integer
  not null
  default 1;


alter table
  public.faculty_teaching_allocations
drop constraint if exists
  faculty_teaching_allocations_session_length_periods_check;


alter table
  public.faculty_teaching_allocations
add constraint
  faculty_teaching_allocations_session_length_periods_check
check (
  session_length_periods
  between 1 and 6
);


comment on column
  public.faculty_teaching_allocations.session_length_periods
is
'Number of consecutive teaching periods in one timetable session. weekly_hours remains total weekly timetable demand.';


notify pgrst, 'reload schema';
