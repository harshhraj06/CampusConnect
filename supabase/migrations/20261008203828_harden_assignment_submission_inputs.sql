alter table public.assignment_submissions
drop constraint if exists assignment_submissions_submission_url_length_check;

alter table public.assignment_submissions
add constraint assignment_submissions_submission_url_length_check
check (
  char_length(
    coalesce(
      submission_url,
      ''
    )
  ) <= 2048
);


alter table public.assignment_submissions
drop constraint if exists assignment_submissions_file_path_length_check;

alter table public.assignment_submissions
add constraint assignment_submissions_file_path_length_check
check (
  char_length(
    coalesce(
      submission_file_path,
      ''
    )
  ) <= 1024
);


alter table public.assignment_submissions
drop constraint if exists assignment_submissions_file_name_length_check;

alter table public.assignment_submissions
add constraint assignment_submissions_file_name_length_check
check (
  char_length(
    coalesce(
      submission_file_name,
      ''
    )
  ) <= 255
);


alter table public.assignment_submissions
drop constraint if exists assignment_submissions_file_type_length_check;

alter table public.assignment_submissions
add constraint assignment_submissions_file_type_length_check
check (
  char_length(
    coalesce(
      submission_file_type,
      ''
    )
  ) <= 120
);


alter table public.assignment_submissions
drop constraint if exists assignment_submissions_file_size_check;

alter table public.assignment_submissions
add constraint assignment_submissions_file_size_check
check (
  submission_file_size is null
  or (
    submission_file_size >= 0
    and submission_file_size <= 15728640
  )
);


alter table public.assignment_submissions
drop constraint if exists assignment_submissions_https_url_check;

alter table public.assignment_submissions
add constraint assignment_submissions_https_url_check
check (
  btrim(
    coalesce(
      submission_url,
      ''
    )
  ) = ''
  or btrim(
    submission_url
  ) ~* '^https://'
);


alter table public.assignment_submissions
drop constraint if exists assignment_submissions_method_check;

alter table public.assignment_submissions
add constraint assignment_submissions_method_check
check (
  btrim(
    coalesce(
      submission_url,
      ''
    )
  ) <> ''
  or btrim(
    coalesce(
      submission_file_path,
      ''
    )
  ) <> ''
);


alter table public.assignment_submission_evaluations
drop constraint if exists assignment_evaluation_feedback_length_check;

alter table public.assignment_submission_evaluations
add constraint assignment_evaluation_feedback_length_check
check (
  char_length(
    coalesce(
      faculty_feedback,
      ''
    )
  ) <= 5000
);


drop policy if exists
  "Students submit their work"
on public.assignment_submissions;

create policy
  "Students submit their work"
on public.assignment_submissions
for insert
to authenticated
with check (
  student_id = auth.uid()

  and public.current_campus_role() =
    'Student'

  and exists (
    select 1
    from public.assignments assignment
    where
      assignment.id =
        assignment_submissions.assignment_id
      and (
        (
          assignment.audience_batch_id is not null
          and exists (
            select 1
            from public.attendance_batch_students batch_student
            where
              batch_student.batch_id =
                assignment.audience_batch_id
              and batch_student.student_id =
                auth.uid()
          )
        )

        or (
          assignment.audience_batch_id is null
          and (
            assignment.audience_department =
              'All'
            or assignment.audience_department =
              public.current_campus_department()
          )
        )
      )
  )

  and (
    submission_file_path is null
    or btrim(
      submission_file_path
    ) = ''
    or split_part(
      btrim(
        submission_file_path
      ),
      '/',
      1
    ) = auth.uid()::text
  )

  and (
    btrim(
      coalesce(
        submission_url,
        ''
      )
    ) = ''
    or btrim(
      submission_url
    ) ~* '^https://'
  )

  and (
    submission_file_size is null
    or (
      submission_file_size >= 0
      and submission_file_size <= 15728640
    )
  )
);


drop policy if exists
  "Students update their submission"
on public.assignment_submissions;

create policy
  "Students update their submission"
on public.assignment_submissions
for update
to authenticated
using (
  student_id =
    auth.uid()
)
with check (
  student_id = auth.uid()

  and public.current_campus_role() =
    'Student'

  and exists (
    select 1
    from public.assignments assignment
    where
      assignment.id =
        assignment_submissions.assignment_id
      and (
        (
          assignment.audience_batch_id is not null
          and exists (
            select 1
            from public.attendance_batch_students batch_student
            where
              batch_student.batch_id =
                assignment.audience_batch_id
              and batch_student.student_id =
                auth.uid()
          )
        )

        or (
          assignment.audience_batch_id is null
          and (
            assignment.audience_department =
              'All'
            or assignment.audience_department =
              public.current_campus_department()
          )
        )
      )
  )

  and (
    submission_file_path is null
    or btrim(
      submission_file_path
    ) = ''
    or split_part(
      btrim(
        submission_file_path
      ),
      '/',
      1
    ) = auth.uid()::text
  )

  and (
    btrim(
      coalesce(
        submission_url,
        ''
      )
    ) = ''
    or btrim(
      submission_url
    ) ~* '^https://'
  )

  and (
    submission_file_size is null
    or (
      submission_file_size >= 0
      and submission_file_size <= 15728640
    )
  )
);

notify pgrst, 'reload schema';
