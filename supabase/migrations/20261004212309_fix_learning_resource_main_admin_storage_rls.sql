drop policy if exists
  "Assigned Faculty and Admin upload learning files"
on storage.objects;

create policy
  "Assigned Faculty and Admin upload learning files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'learning-resources'

  and
  (storage.foldername(name))[1] = auth.uid()::text

  and
  char_length(
    coalesce(
      (storage.foldername(name))[2],
      ''
    )
  ) > 0

  and (
    (
      public.current_campus_role() = 'Faculty'

      and
      public.faculty_has_department(
        auth.uid(),
        (storage.foldername(name))[2]
      )
    )

    or

    (
      public.current_campus_role() = 'Main Admin'

      and exists (
        select 1
        from public.campus_branches branch
        where branch.is_active = true
          and public.same_campus_department(
            branch.name,
            (storage.foldername(name))[2]
          )
      )
    )
  )
);
