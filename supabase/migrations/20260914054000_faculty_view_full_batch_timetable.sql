-- ============================================================
-- CAMPUSCONNECT — FACULTY FULL BATCH TIMETABLE VIEW
--
-- Faculty may VIEW every timetable entry for a batch where
-- they teach at least one subject.
--
-- Existing INSERT / UPDATE / DELETE restrictions remain.
-- ============================================================

drop policy if exists
"Faculty read assigned timetable"
on public.batch_timetable_entries;


create policy
"Faculty read assigned batch timetable"
on public.batch_timetable_entries
for select
to authenticated
using (
  public.current_campus_role() = 'Faculty'

  and exists (
    select 1
    from public.attendance_batch_subjects own_subject
    where
      own_subject.batch_id =
        batch_timetable_entries.batch_id

      and own_subject.faculty_id =
        auth.uid()
  )
);


notify pgrst, 'reload schema';
