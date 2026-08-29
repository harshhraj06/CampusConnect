-- =========================================================
-- CAMPUSCONNECT — EVENT ROLE PERMISSIONS
-- =========================================================

create or replace function public.check_in_event_attendee(
  p_event_id uuid,
  p_check_in_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_registration public.event_registrations%rowtype;
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_role := public.current_campus_role();

  if v_role not in (
    'Faculty',
    'Coordinator',
    'Volunteer',
    'Placement Cell',
    'Main Admin'
  ) then
    raise exception 'You are not authorized to check in event attendees';
  end if;

  select *
  into v_registration
  from public.event_registrations
  where event_id = p_event_id
    and check_in_code = trim(p_check_in_code)
  limit 1;

  if not found then
    raise exception 'Invalid event pass';
  end if;

  if v_registration.status <> 'Going' then
    raise exception 'This registration is not active';
  end if;

  if v_registration.checked_in then
    return jsonb_build_object(
      'success', true,
      'already_checked_in', true,
      'student_name', v_registration.student_name,
      'department', v_registration.department,
      'graduation_year', v_registration.graduation_year,
      'checked_in_at', v_registration.checked_in_at
    );
  end if;

  update public.event_registrations
  set
    checked_in = true,
    checked_in_at = now(),
    checked_in_by = auth.uid(),
    updated_at = now()
  where id = v_registration.id
  returning *
  into v_registration;

  return jsonb_build_object(
    'success', true,
    'already_checked_in', false,
    'student_name', v_registration.student_name,
    'department', v_registration.department,
    'graduation_year', v_registration.graduation_year,
    'checked_in_at', v_registration.checked_in_at
  );

end;
$$;

grant execute
on function public.check_in_event_attendee(uuid,text)
to authenticated;
