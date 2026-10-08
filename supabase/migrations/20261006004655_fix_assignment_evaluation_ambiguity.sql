create or replace function public.save_assignment_submission_evaluation(
  target_assignment_id uuid,
  target_student_id uuid,
  target_marks_awarded numeric,
  target_marks_out_of numeric,
  target_feedback text
)
returns table(
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
as $function$
declare
  v_assignment public.assignments%rowtype;
  v_submission public.assignment_submissions%rowtype;
  v_evaluation public.assignment_submission_evaluations%rowtype;
begin

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;

  if public.current_campus_role() <> 'Faculty' then
    raise exception
      'Only Faculty can evaluate assignment submissions.';
  end if;

  select assignment.*
  into v_assignment
  from public.assignments as assignment
  where assignment.id =
    target_assignment_id;

  if not found then
    raise exception
      'Assignment not found.';
  end if;

  if v_assignment.created_by <>
    auth.uid()
  then
    raise exception
      'You can only evaluate submissions for assignments you created.';
  end if;

  if
    v_assignment.batch_subject_id is not null
    and not public.can_access_assigned_batch_subject(
      v_assignment.batch_subject_id
    )
  then
    raise exception
      'You no longer have access to this assignment subject.';
  end if;

  select submission.*
  into v_submission
  from public.assignment_submissions as submission
  where
    submission.assignment_id =
      target_assignment_id
    and
    submission.student_id =
      target_student_id;

  if not found then
    raise exception
      'Student has not submitted this assignment.';
  end if;

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
    trim(coalesce(target_feedback, '')),
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
$function$;

revoke execute on function public.save_assignment_submission_evaluation(
  uuid,
  uuid,
  numeric,
  numeric,
  text
) from anon;

grant execute on function public.save_assignment_submission_evaluation(
  uuid,
  uuid,
  numeric,
  numeric,
  text
) to authenticated;

notify pgrst, 'reload schema';
