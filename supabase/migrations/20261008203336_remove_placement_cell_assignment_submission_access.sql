drop policy if exists
  "Submission access"
on public.assignment_submissions;

create policy
  "Submission access"
on public.assignment_submissions
for select
to authenticated
using (
  student_id = auth.uid()

  or public.current_campus_role() =
    'Main Admin'

  or (
    public.current_campus_role() =
      'Faculty'
    and exists (
      select 1
      from public.assignments assignment
      where
        assignment.id =
          assignment_submissions.assignment_id
        and assignment.created_by =
          auth.uid()
    )
  )
);

notify pgrst, 'reload schema';
