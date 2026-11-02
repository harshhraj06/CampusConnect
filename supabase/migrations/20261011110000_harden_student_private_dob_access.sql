-- Explicitly require an active staff account for private DOB reads.
-- Preserve student self-read and self-write behavior.
-- Faculty scope mirrors the directory's batch-assignment logic.

drop policy if exists student_private_profile_read_authorized
  on public.student_private_profile_data;

create policy student_private_profile_read_authorized
  on public.student_private_profile_data
  for select
  to authenticated
  using (
    student_id = (select auth.uid())

    or exists (
      select 1
      from public.profiles actor
      where actor.id = (select auth.uid())
        and actor.role = 'Main Admin'
        and coalesce(actor.account_status::text, 'Active') = 'Active'
    )

    or (
      exists (
        select 1
        from public.profiles actor
        where actor.id = (select auth.uid())
          and actor.role = 'Faculty'
          and coalesce(actor.account_status::text, 'Active') = 'Active'
      )
      and (
        exists (
          select 1
          from public.attendance_batch_students abs
          join public.attendance_batch_subjects absu
            on absu.batch_id = abs.batch_id
          where abs.student_id =
                student_private_profile_data.student_id
            and absu.faculty_id = (select auth.uid())
        )
        or exists (
          select 1
          from public.attendance_batch_students abs
          join public.faculty_teaching_allocations fta
            on fta.batch_id = abs.batch_id
          where abs.student_id =
                student_private_profile_data.student_id
            and fta.faculty_id = (select auth.uid())
            and fta.status = 'Active'
        )
      )
    )
  );
