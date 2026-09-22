-- ============================================================
-- CAMPUSCONNECT — ATTENDANCE EMAIL DELIVERY RETRY HARDENING
--
-- Adds:
--   1. Maximum delivery attempt limit
--   2. Exponential retry backoff for Failed email jobs
--   3. Recovery of stale Processing email jobs
--
-- This migration DOES NOT send emails.
-- ============================================================


-- ------------------------------------------------------------
-- 1. RETRY METADATA
-- ------------------------------------------------------------

alter table
public.attendance_notification_outbox
add column if not exists
next_attempt_at timestamptz;


alter table
public.attendance_notification_outbox
add column if not exists
processing_started_at timestamptz;


create index if not exists
attendance_notification_outbox_email_retry_idx
on public.attendance_notification_outbox (
  delivery_status,
  next_attempt_at,
  updated_at
)
where channel = 'email';


-- ------------------------------------------------------------
-- 2. SAFE EMAIL CLAIM
--
-- Rules:
--
-- Pending:
--   may be claimed immediately while attempts < 5
--
-- Failed:
--   may be claimed only after next_attempt_at
--
-- Processing:
--   cannot be claimed here
--
-- Sent / Skipped:
--   never claimable
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 3. RECORD RETRYABLE FAILURE
--
-- Backoff:
--
-- attempt 1 -> 1 minute
-- attempt 2 -> 2 minutes
-- attempt 3 -> 4 minutes
-- attempt 4 -> 8 minutes
-- attempt 5 -> terminal Failed
--
-- Provider error is server-controlled and truncated.
-- ------------------------------------------------------------

create or replace function
public.fail_attendance_email_delivery(
  target_outbox_id uuid,
  failure_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts integer;
begin

  select
    attempts
  into
    v_attempts
  from
    public.attendance_notification_outbox
  where
    id = target_outbox_id
    and channel = 'email'
    and delivery_status = 'Processing'
  for update;


  if not found then
    return false;
  end if;


  update
    public.attendance_notification_outbox
  set
    delivery_status =
      'Failed',

    last_error =
      left(
        coalesce(
          failure_message,
          'Email delivery failed.'
        ),
        1500
      ),

    next_attempt_at =
      case
        when coalesce(v_attempts, 0) >= 5
          then null

        else
          now() +
          make_interval(
            mins =>
              power(
                2,
                greatest(
                  coalesce(v_attempts, 1) - 1,
                  0
                )
              )::integer
          )
      end,

    processing_started_at =
      null,

    updated_at =
      now()

  where
    id = target_outbox_id
    and delivery_status =
      'Processing';


  return found;

end;
$$;


revoke all
on function
public.fail_attendance_email_delivery(uuid, text)
from public, anon, authenticated;


-- ------------------------------------------------------------
-- 4. MARK PROVIDER-ACCEPTED EMAIL AS SENT
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 5. RECOVER STALE PROCESSING JOBS
--
-- A worker may crash after claiming a row.
--
-- Processing rows older than 15 minutes become Failed and are
-- made eligible for retry according to the normal retry flow.
--
-- IMPORTANT:
-- The provider request uses a stable idempotency key based on
-- the outbox ID, so a retry keeps the same provider identity.
-- ------------------------------------------------------------

create or replace function
public.recover_stale_attendance_email_deliveries()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin

  update
    public.attendance_notification_outbox
  set
    delivery_status =
      'Failed',

    last_error =
      case
        when last_error = ''
          then
            'Delivery worker did not finish the claimed job.'

        else
          last_error
      end,

    next_attempt_at =
      case
        when attempts >= 5
          then null

        else
          now()
      end,

    processing_started_at =
      null,

    updated_at =
      now()

  where
    channel =
      'email'

    and delivery_status =
      'Processing'

    and coalesce(
      processing_started_at,
      updated_at
    ) <=
      now() -
      interval '15 minutes';


  get diagnostics
    v_count =
      row_count;


  return v_count;

end;
$$;


revoke all
on function
public.recover_stale_attendance_email_deliveries()
from public, anon, authenticated;


notify pgrst, 'reload schema';
