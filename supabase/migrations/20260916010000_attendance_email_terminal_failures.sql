-- ============================================================
-- CAMPUSCONNECT
-- ATTENDANCE EMAIL TERMINAL FAILURE HARDENING
--
-- Retryable provider/network failures continue using
-- fail_attendance_email_delivery().
--
-- Permanent provider failures use
-- terminal_fail_attendance_email_delivery().
--
-- attempts remains the real number of provider attempts.
-- ============================================================


alter table
  public.attendance_notification_outbox
add column if not exists
  terminal_failure_at timestamptz;


create index if not exists
  attendance_notification_outbox_terminal_email_idx
on
  public.attendance_notification_outbox (
    delivery_status,
    terminal_failure_at
  )
where
  channel = 'email';


-- ============================================================
-- CLAIM
--
-- Terminal failures can never be claimed again.
-- ============================================================

create or replace function
public.claim_attendance_email_delivery(
  target_outbox_id uuid
)
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

  select *
  into v_row
  from public.attendance_notification_outbox
  where
    attendance_notification_outbox.id =
      target_outbox_id
  for update;


  if not found then
    return;
  end if;


  if v_row.channel <> 'email' then
    return;
  end if;


  if v_row.terminal_failure_at is not null then
    return;
  end if;


  if coalesce(v_row.attempts, 0) >= 5 then
    return;
  end if;


  if v_row.delivery_status = 'Pending' then

    null;

  elsif v_row.delivery_status = 'Failed' then

    if
      v_row.next_attempt_at is not null
      and v_row.next_attempt_at > now()
    then
      return;
    end if;

  else

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
      target_outbox_id

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


revoke all
on function
public.claim_attendance_email_delivery(uuid)
from public, anon, authenticated;


-- ============================================================
-- TERMINAL FAILURE
--
-- Used for permanent provider rejection:
--   400 / 401 / 403 / ordinary non-retryable 4xx.
--
-- attempts is NOT changed here because claim() already counted
-- the real provider attempt.
-- ============================================================

create or replace function
public.terminal_fail_attendance_email_delivery(
  target_outbox_id uuid,
  failure_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin

  update
    public.attendance_notification_outbox
  set
    delivery_status =
      'Failed',

    last_error =
      left(
        coalesce(
          failure_message,
          'Email delivery permanently failed.'
        ),
        1500
      ),

    terminal_failure_at =
      now(),

    next_attempt_at =
      null,

    processing_started_at =
      null,

    updated_at =
      now()

  where
    id =
      target_outbox_id

    and channel =
      'email'

    and delivery_status =
      'Processing';


  return found;

end;
$$;


revoke all
on function
public.terminal_fail_attendance_email_delivery(uuid, text)
from public, anon, authenticated;


-- ============================================================
-- COMPLETE
--
-- Successful delivery must have no terminal marker.
-- ============================================================

create or replace function
public.complete_attendance_email_delivery(
  target_outbox_id uuid,
  target_provider_message_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin

  update
    public.attendance_notification_outbox
  set
    delivery_status =
      'Sent',

    provider_message_id =
      left(
        coalesce(
          target_provider_message_id,
          ''
        ),
        500
      ),

    last_error =
      '',

    sent_at =
      now(),

    next_attempt_at =
      null,

    processing_started_at =
      null,

    terminal_failure_at =
      null,

    updated_at =
      now()

  where
    id =
      target_outbox_id

    and channel =
      'email'

    and delivery_status =
      'Processing';


  return found;

end;
$$;


revoke all
on function
public.complete_attendance_email_delivery(uuid, text)
from public, anon, authenticated;


notify pgrst, 'reload schema';
