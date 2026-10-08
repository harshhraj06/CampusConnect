drop policy if exists "Assigned Faculty update learning resources"
on public.learning_resources;

drop policy if exists "Assigned Faculty delete learning resources"
on public.learning_resources;

create policy "Admin and owners update learning resources"
on public.learning_resources
for update
to authenticated
using (
  public.current_campus_role() = 'Main Admin'

  or (
    public.current_campus_role() = 'Faculty'
    and added_by = auth.uid()
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
)
with check (
  public.current_campus_role() = 'Main Admin'

  or (
    public.current_campus_role() = 'Faculty'
    and added_by = auth.uid()
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
);

create policy "Admin and owners delete learning resources"
on public.learning_resources
for delete
to authenticated
using (
  public.current_campus_role() = 'Main Admin'

  or (
    public.current_campus_role() = 'Faculty'
    and added_by = auth.uid()
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
);

drop policy if exists "Faculty owners and Admin delete learning files"
on storage.objects;

create policy "Admin and owners delete learning files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'learning-resources'
  and (
    public.current_campus_role() = 'Main Admin'

    or (
      public.current_campus_role() = 'Faculty'
      and (storage.foldername(objects.name))[1] = auth.uid()::text
      and public.faculty_has_department(
        auth.uid(),
        (storage.foldername(objects.name))[2]
      )
    )

    or (
      public.current_campus_role() = 'Volunteer'
      and (storage.foldername(objects.name))[1] = auth.uid()::text
      and public.same_campus_department(
        (storage.foldername(objects.name))[2],
        public.current_campus_department()
      )
    )
  )
);

notify pgrst, 'reload schema';
