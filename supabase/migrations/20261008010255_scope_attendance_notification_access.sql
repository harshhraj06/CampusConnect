alter function public.generate_attendance_notifications(uuid)
rename to generate_attendance_notifications_internal;

revoke all on function
public.generate_attendance_notifications_internal(uuid)
from public, anon, authenticated;

grant execute on function
public.generate_attendance_notifications_internal(uuid)
to service_role;


create function public.generate_attendance_notifications(
  target_session_id uuid
)
returns table(
  absence_email_queued integer,
  absence_sms_queued integer,
  low_attendance_email_queued integer,
  in_app_created integer,
  absence_notifications_skipped integer
)
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;

  if not public.attendance_staff_can_manage_session(
    target_session_id
  ) then
    raise exception
      'You do not have permission to generate notifications for this attendance session.';
  end if;

  return query
  select *
  from public.generate_attendance_notifications_internal(
    target_session_id
  );
end;
$function$;


revoke execute on function
public.generate_attendance_notifications(uuid)
from public, anon;

grant execute on function
public.generate_attendance_notifications(uuid)
to authenticated, service_role;


create or replace function public.get_attendance_notification_delivery_summary(
  target_session_id uuid
)
returns table(
  channel text,
  notification_type text,
  delivery_status text,
  notification_count bigint
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;

  if not public.attendance_staff_can_manage_session(
    target_session_id
  ) then
    raise exception
      'You are not authorized to view notification delivery for this attendance session.';
  end if;

  return query
  select
    outbox.channel,
    outbox.notification_type,
    outbox.delivery_status,
    count(*)::bigint
  from
    public.attendance_notification_outbox outbox
  where
    outbox.session_id =
      target_session_id
  group by
    outbox.channel,
    outbox.notification_type,
    outbox.delivery_status
  order by
    outbox.channel,
    outbox.notification_type,
    outbox.delivery_status;
end;
$function$;


revoke execute on function
public.get_attendance_notification_delivery_summary(uuid)
from public, anon;

grant execute on function
public.get_attendance_notification_delivery_summary(uuid)
to authenticated, service_role;

notify pgrst, 'reload schema';
