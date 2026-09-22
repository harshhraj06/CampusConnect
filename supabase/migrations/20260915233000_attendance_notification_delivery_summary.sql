-- ============================================================
-- CAMPUSCONNECT — ATTENDANCE NOTIFICATION DELIVERY SUMMARY
--
-- Safe Faculty/Main Admin read-only view of notification
-- delivery state for an attendance session.
--
-- Sensitive fields such as guardian email, phone, message,
-- provider message id and provider error are never returned.
-- ============================================================

create or replace function
public.get_attendance_notification_delivery_summary(
  target_session_id uuid
)
returns table (
  channel text,
  notification_type text,
  delivery_status text,
  notification_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session public.attendance_sessions%rowtype;
  v_role text;
begin
  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;

  select *
  into v_session
  from public.attendance_sessions
  where id = target_session_id;

  if not found then
    raise exception
      'Attendance session not found.';
  end if;

  v_role :=
    public.current_campus_role();

  if not (
    v_role = 'Main Admin'
    or (
      v_role = 'Faculty'
      and v_session.faculty_id = auth.uid()
    )
  ) then
    raise exception
      'You are not authorized to view notification delivery for this attendance session.';
  end if;

  return query
  select
    o.channel,
    o.notification_type,
    o.delivery_status,
    count(*)::bigint
  from
    public.attendance_notification_outbox o
  where
    o.session_id =
      target_session_id
  group by
    o.channel,
    o.notification_type,
    o.delivery_status
  order by
    o.channel,
    o.notification_type,
    o.delivery_status;
end;
$$;


revoke all
on function
public.get_attendance_notification_delivery_summary(uuid)
from public, anon;


grant execute
on function
public.get_attendance_notification_delivery_summary(uuid)
to authenticated;


notify pgrst, 'reload schema';
