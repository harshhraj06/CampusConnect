drop policy if exists "Department scoped learning resource read"
on public.learning_resources;

create policy "Department scoped learning resource read"
on public.learning_resources
for select
to authenticated
using (
  public.current_campus_role() = 'Main Admin'

  or (
    public.current_campus_role() = 'Faculty'
    and public.faculty_has_department(
      auth.uid(),
      department
    )
  )

  or (
    public.current_campus_role() = 'Volunteer'
    and added_by = auth.uid()
    and public.same_campus_department(
      department,
      public.current_campus_department()
    )
  )

  or (
    public.current_campus_role() not in (
      'Faculty',
      'Main Admin'
    )
    and is_verified = true
    and public.same_campus_department(
      department,
      public.current_campus_department()
    )
  )
);

notify pgrst, 'reload schema';
