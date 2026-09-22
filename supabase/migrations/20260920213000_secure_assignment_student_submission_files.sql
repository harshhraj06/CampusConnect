-- ============================================================
-- CAMPUSCONNECT
-- Secure Assignment Student Submission + File Upload
-- ============================================================


-- ============================================================
-- 1. EXTEND SUBMISSION METADATA
-- ============================================================

alter table public.assignment_submissions
add column if not exists
submission_file_path text;

alter table public.assignment_submissions
add column if not exists
submission_file_name text;

alter table public.assignment_submissions
add column if not exists
submission_file_type text;

alter table public.assignment_submissions
add column if not exists
submission_file_size bigint;


-- ============================================================
-- 2. SECURE STUDENT SUBMISSION RPC
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
  select *
  into v_assignment
  from public.assignments
  where id =
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
      from public.attendance_batch_students abs
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


  -- ==========================================================
  -- REQUIRE LINK OR FILE
  -- ==========================================================

  if
    v_url = ''
    and v_file_path is null
  then

    raise exception
      'Upload a file or provide a submission link.';
  end if;


  -- HTTPS link validation
  if
    v_url <> ''
    and v_url !~* '^https://'
  then

    raise exception
      'Submission link must use HTTPS.';
  end if;


  -- ==========================================================
  -- FILE OWNERSHIP VALIDATION
  --
  -- Storage path must begin:
  -- auth.uid()/...
  -- ==========================================================

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


  -- Student display name
  select *
  into v_student
  from public.profiles
  where id =
    auth.uid();


  -- ==========================================================
  -- UPSERT SUBMISSION
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

  on conflict (
    assignment_id,
    student_id
  )

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

  returning *
  into v_submission;


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


-- ============================================================
-- 3. ALLOW AUTHORIZED USERS TO READ STUDENT SUBMISSION FILES
--
-- Existing assignment attachment access remains intact.
-- assignment_submissions RLS decides who can see student work.
-- ============================================================

drop policy if exists
"Assignment files read"
on storage.objects;


create policy
"Assignment files read"
on storage.objects
for select
to authenticated
using (
  bucket_id =
    'assignment-files'

  and (
    exists (
      select 1
      from public.assignment_attachments aa
      where aa.file_path =
        objects.name
    )

    or

    exists (
      select 1
      from public.assignment_submissions s
      where s.submission_file_path =
        objects.name
    )
  )
);


notify pgrst, 'reload schema';
