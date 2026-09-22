-- ============================================================
-- CAMPUSCONNECT
-- Fix attendance_batch_subjects insert permissions.
--
-- Faculty:
--   may create subjects only when assigning themselves.
--
-- Coordinator / Main Admin:
--   may create subjects and assign any faculty member.
-- ============================================================

drop policy if exists
"Staff create batch subjects"
on public.attendance_batch_subjects;


create policy
"Staff create batch subjects"
on public.attendance_batch_subjects
for insert
to authenticated
with check (

  (
    public.current_campus_role() = 'Faculty'
    and faculty_id = auth.uid()
  )

  or

  public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )

);


notify pgrst, 'reload schema';
