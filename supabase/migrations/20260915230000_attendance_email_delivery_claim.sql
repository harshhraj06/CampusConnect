-- ============================================================
-- CAMPUSCONNECT — ATTENDANCE EMAIL DELIVERY CLAIM
--
-- Server-side helper for safely claiming queued attendance
-- emails before an external provider is called.
--
-- This function is NOT executable by authenticated browser
-- users. It is intended for the service-role delivery route.
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

  -- Lock the row so concurrent delivery workers cannot
  -- claim the same notification simultaneously.

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


  -- Only email jobs are handled by this claim function.

  if v_row.channel <> 'email' then
    return;
  end if;


  -- Sent / Skipped / Processing jobs cannot be reclaimed.

  if v_row.delivery_status
    not in (
      'Pending',
      'Failed'
    )
  then
    return;
  end if;


  update public.attendance_notification_outbox
  set
    delivery_status =
      'Processing',

    attempts =
      coalesce(
        attendance_notification_outbox.attempts,
        0
      ) + 1,

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


-- Browser users must never be able to claim delivery jobs.

revoke all
on function public.claim_attendance_email_delivery(uuid)
from public, anon, authenticated;


notify pgrst, 'reload schema';
