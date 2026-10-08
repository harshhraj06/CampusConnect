drop policy if exists
  "Assigned Faculty create learning resources"
on public.learning_resources;

create policy
  "Faculty Volunteer and Admin create learning resources"
on public.learning_resources
for insert
to authenticated
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

drop policy if exists
  "Assigned Faculty and Admin upload learning files"
on storage.objects;

create policy
  "Faculty Volunteer and Admin upload learning files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'learning-resources'

  and
  (storage.foldername(objects.name))[1] = auth.uid()::text

  and
  char_length(
    coalesce(
      (storage.foldername(objects.name))[2],
      ''
    )
  ) > 0

  and (
    (
      public.current_campus_role() = 'Faculty'
      and public.faculty_has_department(
        auth.uid(),
        (storage.foldername(objects.name))[2]
      )
    )

    or (
      public.current_campus_role() = 'Volunteer'
      and public.same_campus_department(
        (storage.foldername(objects.name))[2],
        public.current_campus_department()
      )
    )

    or (
      public.current_campus_role() = 'Main Admin'
      and exists (
        select 1
        from public.campus_branches branch
        where branch.is_active = true
          and public.same_campus_department(
            branch.name,
            (storage.foldername(objects.name))[2]
          )
      )
    )
  )
);
