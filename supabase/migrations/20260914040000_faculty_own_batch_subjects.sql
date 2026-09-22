drop policy if exists
"Batch subjects readable"
on public.attendance_batch_subjects;

create policy
"Batch subjects readable"
on public.attendance_batch_subjects
for select
to authenticated
using (
  (
    public.current_campus_role() = 'Faculty'
    and faculty_id = auth.uid()
  )

  or public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )

  or exists (
    select 1
    from public.attendance_batch_students bs
    where
      bs.batch_id =
        attendance_batch_subjects.batch_id
      and bs.student_id =
        auth.uid()
  )
);

notify pgrst, 'reload schema';
