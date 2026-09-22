-- ============================================================
-- CAMPUSCONNECT
-- CLAIM NEXT DUE ATTENDANCE EMAIL
--
-- Server-only queue primitive for automatic delivery workers.
--
-- IMPORTANT:
-- - Does not send email.
-- - Does not expose browser access.
-- - Uses row locking + SKIP LOCKED for concurrent workers.
-- - Preserves retry/terminal/max-attempt semantics.
-- ============================================================

create or replace function
public.claim_next_attendance_email_delivery()
returns table (
  id uuid,
  student_id uuid,
  session_id uuid,
  notification_type text,
  recipient text,
  subject text,
  message text,
  attempts integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row
    public.attendance_notification_outbox%rowtype;
begin

  /*
   * Select exactly one currently eligible email.
   *
   * SKIP LOCKED means multiple trusted workers may call this
   * concurrently without claiming the same outbox row.
   */
  select o.*
  into v_row
  from public.attendance_notification_outbox as o
  where
    o.channel = 'email'

    and o.terminal_failure_at is null

    and coalesce(
      o.attempts,
      0
    ) < 5

    and (
      o.delivery_status = 'Pending'

      or (
        o.delivery_status = 'Failed'

        and (
          o.next_attempt_at is null
          or o.next_attempt_at <= now()
        )
      )
    )

  order by
    case
      when o.delivery_status = 'Pending'
        then 0
      else 1
    end,

    coalesce(
      o.next_attempt_at,
      o.created_at
    ) asc,

    o.created_at asc

  for update skip locked

  limit 1;


  if not found then
    return;
  end if;


  update
    public.attendance_notification_outbox
  set
    delivery_status =
      'Processing',

    attempts =
      coalesce(
        attendance_notification_outbox.attempts,
        0
      ) + 1,

    processing_started_at =
      now(),

    next_attempt_at =
      null,

    last_error =
      '',

    updated_at =
      now()

  where
    attendance_notification_outbox.id =
      v_row.id

  returning *
  into v_row;


  return query
  select
    v_row.id,
    v_row.student_id,
    v_row.session_id,
    v_row.notification_type,
    v_row.recipient,
    v_row.subject,
    v_row.message,
    v_row.attempts;

end;
$$;


-- Server/service-role only.
-- Browser users must never be able to pull arbitrary queued
-- recipient addresses or messages from the delivery queue.

revoke all
on function
public.claim_next_attendance_email_delivery()
from public, anon, authenticated;


notify pgrst, 'reload schema';
