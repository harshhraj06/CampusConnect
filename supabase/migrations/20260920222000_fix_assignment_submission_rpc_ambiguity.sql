-- ============================================================
-- CAMPUSCONNECT
-- Fix submit_assignment_work PL/pgSQL ambiguity
-- ============================================================

create or replace function
public.submit_assignment_work(
  target_assignment_id uuid,
  target_submission_url text default '',
  target_file_path text default null,
  target_file_name text default null,
  target_file_type text default null,
  target_file_size bigint default null
)
returns table (
  submission_id uuid,
  assignment_id uuid,
  student_id uuid,
  submission_url text,
  submission_file_path text,
  submission_file_name text,
  submission_file_type text,
  submission_file_size bigint,
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment
    public.assignments%rowtype;

  v_student
    public.profiles%rowtype;

  v_submission
    public.assignment_submissions%rowtype;

  v_is_allowed boolean := false;

  v_url text :=
    trim(
      coalesce(
        target_submission_url,
        ''
      )
    );

  v_file_path text :=
    nullif(
      trim(
        coalesce(
          target_file_path,
          ''
        )
      ),
      ''
    );
begin

  -- Authentication
  if auth.uid() is null then
    raise exception
      'Sign in to submit assignment work.';
  end if;


  -- Student role only
  if public.current_campus_role() <>
    'Student' then

    raise exception
      'Only Student accounts can submit assignment work.';
  end if;


  -- Assignment
  select a.*
  into v_assignment
  from public.assignments as a
  where
    a.id =
      target_assignment_id;


  if not found then
    raise exception
      'Assignment not found.';
  end if;


  -- ==========================================================
  -- AUDIENCE VALIDATION
  -- ==========================================================

  if v_assignment.audience_batch_id
    is not null then

    select exists (
      select 1
      from public.attendance_batch_students as abs
      where
        abs.batch_id =
          v_assignment.audience_batch_id

        and abs.student_id =
          auth.uid()
    )
    into v_is_allowed;

  else

    v_is_allowed :=
      (
        v_assignment.audience_department =
          'All'
        or
        v_assignment.audience_department =
          public.current_campus_department()
      );

  end if;


  if not v_is_allowed then
    raise exception
      'Your Student account is not enrolled in the target batch for this assignment.';
  end if;


  -- Require at least one submission method
  if
    v_url = ''
    and v_file_path is null
  then

    raise exception
      'Upload a file or provide a submission link.';
  end if;


  -- HTTPS validation
  if
    v_url <> ''
    and v_url !~* '^https://'
  then

    raise exception
      'Submission link must use HTTPS.';
  end if;


  -- Storage ownership validation
  if
    v_file_path is not null
    and split_part(
      v_file_path,
      '/',
      1
    ) <> auth.uid()::text
  then

    raise exception
      'Invalid submission file ownership.';
  end if;


  -- File size validation
  if
    target_file_size is not null
    and (
      target_file_size < 0
      or target_file_size >
        15728640
    )
  then

    raise exception
      'Submission file must be 15 MB or smaller.';
  end if;


  -- Student profile
  select p.*
  into v_student
  from public.profiles as p
  where
    p.id =
      auth.uid();


  -- ==========================================================
  -- UPSERT
  -- Use the existing named unique constraint to avoid
  -- assignment_id / student_id ambiguity.
  -- ==========================================================

  insert into
  public.assignment_submissions (
    assignment_id,
    student_id,
    student_name,
    status,
    submission_url,
    submission_file_path,
    submission_file_name,
    submission_file_type,
    submission_file_size,
    submitted_at
  )
  values (
    v_assignment.id,
    auth.uid(),

    coalesce(
      nullif(
        trim(
          v_student.full_name
        ),
        ''
      ),
      'Student'
    ),

    'Submitted',

    v_url,

    v_file_path,

    nullif(
      trim(
        coalesce(
          target_file_name,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          target_file_type,
          ''
        )
      ),
      ''
    ),

    target_file_size,

    now()
  )

  on conflict
  on constraint
    assignment_submissions_assignment_id_student_id_key

  do update set
    student_name =
      excluded.student_name,

    status =
      'Submitted',

    submission_url =
      excluded.submission_url,

    submission_file_path =
      excluded.submission_file_path,

    submission_file_name =
      excluded.submission_file_name,

    submission_file_type =
      excluded.submission_file_type,

    submission_file_size =
      excluded.submission_file_size,

    submitted_at =
      now()

  returning
    assignment_submissions.*
  into
    v_submission;


  return query
  select
    v_submission.id,
    v_submission.assignment_id,
    v_submission.student_id,
    v_submission.submission_url,
    v_submission.submission_file_path,
    v_submission.submission_file_name,
    v_submission.submission_file_type,
    v_submission.submission_file_size,
    v_submission.submitted_at;

end;
$$;


revoke all
on function
public.submit_assignment_work(
  uuid,
  text,
  text,
  text,
  text,
  bigint
)
from public, anon;


grant execute
on function
public.submit_assignment_work(
  uuid,
  text,
  text,
  text,
  text,
  bigint
)
to authenticated;


notify pgrst, 'reload schema';
