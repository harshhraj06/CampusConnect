-- ============================================================
-- CAMPUSCONNECT
-- Assignment Submission Evaluation Foundation
--
-- Keeps Faculty evaluation separate from Student submission data.
--
-- Security goals:
--   • Students cannot create/update/delete evaluations.
--   • Students can read only their own evaluation.
--   • Faculty can evaluate only submissions belonging to
--     assignments they created.
--   • Main Admin can read evaluations.
--   • One evaluation per submission.
-- ============================================================


-- ============================================================
-- 1. EVALUATION TABLE
-- ============================================================

create table if not exists
public.assignment_submission_evaluations (
  id uuid primary key
    default gen_random_uuid(),

  submission_id uuid not null
    references public.assignment_submissions(id)
    on delete cascade,

  assignment_id uuid not null
    references public.assignments(id)
    on delete cascade,

  student_id uuid not null,

  marks_awarded numeric(8,2),

  marks_out_of numeric(8,2),

  faculty_feedback text not null
    default '',

  graded_by uuid not null,

  graded_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint
    assignment_submission_evaluations_marks_valid
  check (
    (
      marks_awarded is null
      and marks_out_of is null
    )
    or
    (
      marks_awarded is not null
      and marks_out_of is not null
      and marks_out_of > 0
      and marks_awarded >= 0
      and marks_awarded <= marks_out_of
    )
  ),

  constraint
    assignment_submission_evaluations_submission_unique
  unique (
    submission_id
  )
);


create index if not exists
assignment_submission_evaluations_assignment_idx
on public.assignment_submission_evaluations(
  assignment_id
);


create index if not exists
assignment_submission_evaluations_student_idx
on public.assignment_submission_evaluations(
  student_id
);


create index if not exists
assignment_submission_evaluations_grader_idx
on public.assignment_submission_evaluations(
  graded_by
);


-- ============================================================
-- 2. RLS
-- ============================================================

alter table
public.assignment_submission_evaluations
enable row level security;


drop policy if exists
"Students read own assignment evaluations"
on public.assignment_submission_evaluations;


create policy
"Students read own assignment evaluations"
on public.assignment_submission_evaluations
for select
to authenticated
using (
  student_id =
    auth.uid()
);


drop policy if exists
"Faculty read own assignment evaluations"
on public.assignment_submission_evaluations;


create policy
"Faculty read own assignment evaluations"
on public.assignment_submission_evaluations
for select
to authenticated
using (
  public.current_campus_role() =
    'Faculty'

  and exists (
    select 1
    from public.assignments a
    where
      a.id =
        assignment_submission_evaluations.assignment_id

      and a.created_by =
        auth.uid()
  )
);


drop policy if exists
"Main Admin reads assignment evaluations"
on public.assignment_submission_evaluations;


create policy
"Main Admin reads assignment evaluations"
on public.assignment_submission_evaluations
for select
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
);


-- ============================================================
-- 3. SECURE FACULTY UPSERT RPC
--
-- We use an RPC rather than browser INSERT/UPDATE policies.
-- This gives one authoritative validation path.
-- ============================================================

create or replace function
public.save_assignment_submission_evaluation(
  target_assignment_id uuid,
  target_student_id uuid,
  target_marks_awarded numeric,
  target_marks_out_of numeric,
  target_feedback text
)
returns table (
  evaluation_id uuid,
  submission_id uuid,
  assignment_id uuid,
  student_id uuid,
  marks_awarded numeric,
  marks_out_of numeric,
  faculty_feedback text,
  graded_by uuid,
  graded_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment
    public.assignments%rowtype;

  v_submission
    public.assignment_submissions%rowtype;

  v_evaluation
    public.assignment_submission_evaluations%rowtype;
begin

  -- ==========================================================
  -- AUTHENTICATION
  -- ==========================================================

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  if public.current_campus_role() <>
    'Faculty' then

    raise exception
      'Only Faculty can evaluate assignment submissions.';
  end if;


  -- ==========================================================
  -- ASSIGNMENT OWNERSHIP
  -- ==========================================================

  select *
  into v_assignment
  from public.assignments
  where
    id =
      target_assignment_id;


  if not found then
    raise exception
      'Assignment not found.';
  end if;


  if v_assignment.created_by <>
    auth.uid() then

    raise exception
      'You can only evaluate submissions for assignments you created.';
  end if;


  -- ==========================================================
  -- ASSIGNED SUBJECT ACCESS
  -- ==========================================================

  if
    v_assignment.batch_subject_id
      is not null
    and not
      public.can_access_assigned_batch_subject(
        v_assignment.batch_subject_id
      )
  then

    raise exception
      'You no longer have access to this assignment subject.';
  end if;


  -- ==========================================================
  -- SUBMISSION EXISTS
  -- ==========================================================

  select *
  into v_submission
  from public.assignment_submissions
  where
    assignment_id =
      target_assignment_id

    and student_id =
      target_student_id;


  if not found then
    raise exception
      'Student has not submitted this assignment.';
  end if;


  -- ==========================================================
  -- MARK VALIDATION
  -- ==========================================================

  if
    (
      target_marks_awarded is null
      and target_marks_out_of is not null
    )
    or
    (
      target_marks_awarded is not null
      and target_marks_out_of is null
    )
  then

    raise exception
      'Marks awarded and maximum marks must both be provided.';
  end if;


  if
    target_marks_awarded is not null
    and (
      target_marks_out_of <= 0
      or target_marks_awarded < 0
      or target_marks_awarded >
        target_marks_out_of
    )
  then

    raise exception
      'Marks must be between 0 and the maximum marks.';
  end if;


  -- ==========================================================
  -- UPSERT
  -- ==========================================================

  insert into
  public.assignment_submission_evaluations (
    submission_id,
    assignment_id,
    student_id,
    marks_awarded,
    marks_out_of,
    faculty_feedback,
    graded_by,
    graded_at,
    updated_at
  )
  values (
    v_submission.id,
    v_assignment.id,
    v_submission.student_id,
    target_marks_awarded,
    target_marks_out_of,
    trim(
      coalesce(
        target_feedback,
        ''
      )
    ),
    auth.uid(),
    now(),
    now()
  )

  on conflict (
    submission_id
  )

  do update set
    marks_awarded =
      excluded.marks_awarded,

    marks_out_of =
      excluded.marks_out_of,

    faculty_feedback =
      excluded.faculty_feedback,

    graded_by =
      auth.uid(),

    graded_at =
      now(),

    updated_at =
      now()

  returning *
  into v_evaluation;


  return query
  select
    v_evaluation.id,
    v_evaluation.submission_id,
    v_evaluation.assignment_id,
    v_evaluation.student_id,
    v_evaluation.marks_awarded,
    v_evaluation.marks_out_of,
    v_evaluation.faculty_feedback,
    v_evaluation.graded_by,
    v_evaluation.graded_at,
    v_evaluation.updated_at;

end;
$$;


-- ============================================================
-- 4. RPC ACCESS
-- ============================================================

revoke all
on function
public.save_assignment_submission_evaluation(
  uuid,
  uuid,
  numeric,
  numeric,
  text
)
from public, anon;


grant execute
on function
public.save_assignment_submission_evaluation(
  uuid,
  uuid,
  numeric,
  numeric,
  text
)
to authenticated;


notify pgrst, 'reload schema';
