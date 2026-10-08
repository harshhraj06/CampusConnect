revoke all privileges
on table public.assignment_submission_evaluations
from anon;

revoke insert,
       update,
       delete,
       truncate,
       references,
       trigger
on table public.assignment_submission_evaluations
from authenticated;

grant select
on table public.assignment_submission_evaluations
to authenticated;

grant all privileges
on table public.assignment_submission_evaluations
to service_role;


alter table public.assignment_submission_evaluations
drop constraint if exists
  assignment_submission_evaluations_marks_check;

alter table public.assignment_submission_evaluations
add constraint
  assignment_submission_evaluations_marks_check
check (
  (
    marks_awarded is null
    and marks_out_of is null
  )
  or (
    marks_awarded is not null
    and marks_out_of is not null
    and marks_out_of > 0
    and marks_awarded >= 0
    and marks_awarded <= marks_out_of
  )
);


revoke execute on function
public.save_assignment_submission_evaluation(
  uuid,
  uuid,
  numeric,
  numeric,
  text
)
from public, anon;

grant execute on function
public.save_assignment_submission_evaluation(
  uuid,
  uuid,
  numeric,
  numeric,
  text
)
to authenticated, service_role;

notify pgrst, 'reload schema';
