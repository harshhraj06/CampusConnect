-- ============================================================
-- CAMPUSCONNECT — FACULTY DIARY ASSIGNMENT SCOPE
--
-- Faculty may read/create/update diary rows only for subjects
-- actually assigned to their authenticated account.
--
-- Main Admin retains review access.
-- ============================================================


drop policy if exists
"Faculty reads own class diary"
on public.faculty_class_diary;


create policy
"Faculty reads assigned class diary"
on public.faculty_class_diary
for select
to authenticated
using (

  public.current_campus_role() =
    'Main Admin'

  or

  (
    public.current_campus_role() =
      'Faculty'

    and faculty_id =
      auth.uid()

    and batch_subject_id
      is not null

    and exists (

      select 1

      from public.attendance_batch_subjects abs

      where
        abs.id =
          faculty_class_diary.batch_subject_id

        and abs.batch_id =
          faculty_class_diary.batch_id

        and (

          abs.faculty_id =
            auth.uid()

          or exists (

            select 1

            from public.faculty_teaching_allocations fta

            where
              fta.batch_subject_id =
                abs.id

              and fta.batch_id =
                abs.batch_id

              and fta.faculty_id =
                auth.uid()

              and lower(
                trim(
                  coalesce(
                    fta.status,
                    ''
                  )
                )
              ) =
                'active'
          )
        )
    )
  )
);


drop policy if exists
"Faculty creates own class diary"
on public.faculty_class_diary;


create policy
"Faculty creates assigned class diary"
on public.faculty_class_diary
for insert
to authenticated
with check (

  faculty_id =
    auth.uid()

  and public.current_campus_role() =
    'Faculty'

  and batch_subject_id
    is not null

  and exists (

    select 1

    from public.attendance_sessions s

    where
      s.id =
        faculty_class_diary.attendance_session_id

      and s.faculty_id =
        auth.uid()

      and s.batch_id =
        faculty_class_diary.batch_id
  )

  and exists (

    select 1

    from public.attendance_batch_subjects abs

    where
      abs.id =
        faculty_class_diary.batch_subject_id

      and abs.batch_id =
        faculty_class_diary.batch_id

      and (

        abs.faculty_id =
          auth.uid()

        or exists (

          select 1

          from public.faculty_teaching_allocations fta

          where
            fta.batch_subject_id =
              abs.id

            and fta.batch_id =
              abs.batch_id

            and fta.faculty_id =
              auth.uid()

            and lower(
              trim(
                coalesce(
                  fta.status,
                  ''
                )
              )
            ) =
              'active'
        )
      )
  )
);


drop policy if exists
"Faculty updates own class diary"
on public.faculty_class_diary;


create policy
"Faculty updates assigned class diary"
on public.faculty_class_diary
for update
to authenticated
using (

  faculty_id =
    auth.uid()

  and public.current_campus_role() =
    'Faculty'

  and batch_subject_id
    is not null

  and exists (

    select 1

    from public.attendance_batch_subjects abs

    where
      abs.id =
        faculty_class_diary.batch_subject_id

      and abs.batch_id =
        faculty_class_diary.batch_id

      and (

        abs.faculty_id =
          auth.uid()

        or exists (

          select 1

          from public.faculty_teaching_allocations fta

          where
            fta.batch_subject_id =
              abs.id

            and fta.batch_id =
              abs.batch_id

            and fta.faculty_id =
              auth.uid()

            and lower(
              trim(
                coalesce(
                  fta.status,
                  ''
                )
              )
            ) =
              'active'
        )
      )
  )
)

with check (

  faculty_id =
    auth.uid()

  and public.current_campus_role() =
    'Faculty'

  and batch_subject_id
    is not null

  and exists (

    select 1

    from public.attendance_sessions s

    where
      s.id =
        faculty_class_diary.attendance_session_id

      and s.faculty_id =
        auth.uid()

      and s.batch_id =
        faculty_class_diary.batch_id
  )

  and exists (

    select 1

    from public.attendance_batch_subjects abs

    where
      abs.id =
        faculty_class_diary.batch_subject_id

      and abs.batch_id =
        faculty_class_diary.batch_id

      and (

        abs.faculty_id =
          auth.uid()

        or exists (

          select 1

          from public.faculty_teaching_allocations fta

          where
            fta.batch_subject_id =
              abs.id

            and fta.batch_id =
              abs.batch_id

            and fta.faculty_id =
              auth.uid()

            and lower(
              trim(
                coalesce(
                  fta.status,
                  ''
                )
              )
            ) =
              'active'
        )
      )
  )
);
