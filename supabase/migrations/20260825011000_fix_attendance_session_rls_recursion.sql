-- ============================================================
-- CAMPUSCONNECT
-- FIX ATTENDANCE SESSION RLS RECURSION
-- ============================================================
--
-- Previous problem:
--
-- attendance_sessions SELECT policy
--     -> checks attendance_session_entries
--
-- attendance_session_entries SELECT policy
--     -> checks attendance_sessions
--
-- PostgreSQL therefore detects recursive RLS evaluation.
--
-- attendance_session_entries already contains student_id,
-- so student access can be checked directly without querying
-- attendance_sessions again.
-- ============================================================


drop policy if exists
  "Attendance entries readable"
on public.attendance_session_entries;


create policy
  "Attendance entries readable"
on public.attendance_session_entries

for select

to authenticated

using (

  -- Students can read only their own attendance entries.
  student_id =
    (select auth.uid())

  or

  -- Existing CampusConnect attendance management roles
  -- retain staff visibility.
  (
    select public.current_campus_role()
  ) in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )

);


notify pgrst,
  'reload schema';
