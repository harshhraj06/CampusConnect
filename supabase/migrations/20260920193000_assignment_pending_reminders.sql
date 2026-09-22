-- ============================================================
-- CAMPUSCONNECT
-- Assignment Pending Student Reminder Engine
--
-- Faculty can generate in-app reminders only for:
--   • assignments they created
--   • students currently in the assignment's target batch
--   • students who have not submitted
--
-- Reminders are idempotent per:
--   assignment + student + reminder type
--
-- This does NOT send email or SMS.
-- ============================================================


-- ============================================================
-- 1. LINK TASK NOTIFICATIONS TO ASSIGNMENTS
-- ============================================================

alter table public.campus_task_notifications
add column if not exists assignment_id uuid
references public.assignments(id)
on delete cascade;


create index if not exists
campus_task_notifications_assignment_idx
on public.campus_task_notifications(
  assignment_id
);


-- ============================================================
-- 2. DUPLICATE PROTECTION
--
-- One active assignment reminder record per student for the
-- same assignment/reminder type.
-- ============================================================

create unique index if not exists
campus_task_notifications_assignment_reminder_unique
on public.campus_task_notifications(
  assignment_id,
  recipient_id,
  notification_type
)
where assignment_id is not null;


-- ============================================================
-- 3. REMINDER GENERATOR
-- ============================================================

create or replace function
public.remind_assignment_pending_students(
  target_assignment_id uuid
)
returns table (
  pending_students integer,
  reminders_created integer,
  reminders_already_existing integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment
    public.assignments%rowtype;

  v_pending integer := 0;
  v_created integer := 0;
  v_existing integer := 0;

  v_student record;

  v_inserted integer := 0;

  v_deadline_label text;
begin

  -- ==========================================================
  -- AUTHENTICATION
  -- ==========================================================

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  -- ==========================================================
  -- FACULTY ONLY
  -- ==========================================================

  if public.current_campus_role() <>
    'Faculty' then

    raise exception
      'Only Faculty can send assignment reminders.';
  end if;


  -- ==========================================================
  -- LOAD ASSIGNMENT
  -- ==========================================================

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
  -- OWNERSHIP CHECK
  -- ==========================================================

  if v_assignment.created_by <>
    auth.uid() then

    raise exception
      'You can only remind students for assignments you created.';
  end if;


  if v_assignment.audience_batch_id
    is null then

    raise exception
      'Assignment does not have a target batch.';
  end if;


  -- ==========================================================
  -- SUBJECT ACCESS CHECK
  --
  -- New Faculty assignments should have batch_subject_id.
  -- Keep this defensive for any older historical row.
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
      'You no longer have access to this assigned subject.';
  end if;


  v_deadline_label :=
    to_char(
      v_assignment.due_at
        at time zone 'Asia/Kolkata',
      'DD Mon YYYY, HH12:MI AM'
    );


  -- ==========================================================
  -- PROCESS CURRENT PENDING STUDENTS
  -- ==========================================================

  for v_student in

    select
      abs.student_id,
      abs.student_name,
      abs.campus_uid,
      abs.roll_number

    from public.attendance_batch_students abs

    where
      abs.batch_id =
        v_assignment.audience_batch_id

      and not exists (
        select 1
        from public.assignment_submissions s
        where
          s.assignment_id =
            v_assignment.id

          and s.student_id =
            abs.student_id
      )

    order by
      abs.student_name

  loop

    v_pending :=
      v_pending + 1;


    insert into
    public.campus_task_notifications (
      recipient_id,
      task_id,
      activity_id,
      title,
      message,
      read_at,
      created_at,
      notification_type,
      actor_id,
      connection_id,
      target,
      assignment_id
    )
    values (
      v_student.student_id,
      null,
      null,

      'Assignment reminder — ' ||
      trim(
        v_assignment.subject
      ),

      'Reminder: "' ||
      trim(
        v_assignment.title
      ) ||
      '" for ' ||
      trim(
        v_assignment.subject
      ) ||
      ' is due on ' ||
      v_deadline_label ||
      '. Please submit your work from Assignments.',

      null,
      now(),

      'assignment_reminder',

      auth.uid(),
      null,

      'Assignments',

      v_assignment.id
    )

    on conflict (
      assignment_id,
      recipient_id,
      notification_type
    )
    where assignment_id is not null

    do nothing;


    get diagnostics
      v_inserted =
        row_count;


    if v_inserted = 1 then

      v_created :=
        v_created + 1;

    else

      v_existing :=
        v_existing + 1;

    end if;

  end loop;


  return query
  select
    v_pending,
    v_created,
    v_existing;
end;
$$;


-- ============================================================
-- 4. RPC PERMISSIONS
-- ============================================================

revoke all
on function
public.remind_assignment_pending_students(uuid)
from public, anon;


grant execute
on function
public.remind_assignment_pending_students(uuid)
to authenticated;


notify pgrst, 'reload schema';
