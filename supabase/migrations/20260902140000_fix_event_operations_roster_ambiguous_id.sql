begin;

-- =========================================================
-- CAMPUSCONNECT
-- Fix ambiguous ID reference in secure event operations roster
-- =========================================================

create or replace function
public.get_event_operations_roster(
  p_event_id uuid
)
returns table (
  id uuid,
  event_id uuid,
  student_id uuid,
  student_name text,
  student_email text,
  department text,
  graduation_year text,
  status text,
  registered_at timestamptz,
  checked_in boolean,
  checked_in_at timestamptz,
  checked_in_by uuid,
  checked_in_by_name text,
  check_in_method text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path =
  pg_catalog,
  public
as $$
declare
  caller_role text;
  event_creator uuid;
begin

  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  caller_role :=
    coalesce(
      public.current_campus_role()::text,
      ''
    );

  select
    campus_event.created_by
  into
    event_creator
  from
    public.campus_events as campus_event
  where
    campus_event.id = p_event_id;

  if event_creator is null then
    raise exception 'Event not found.';
  end if;

  if not (
    caller_role in (
      'Volunteer',
      'Coordinator',
      'Main Admin'
    )
    or event_creator = auth.uid()
  ) then
    raise exception
      'You do not have permission to view this event roster.';
  end if;

  return query

  select
    registration.id,
    registration.event_id,
    registration.student_id,
    registration.student_name,
    registration.student_email,
    registration.department,
    registration.graduation_year,
    registration.status::text,
    registration.registered_at,
    coalesce(
      registration.checked_in,
      false
    ),
    registration.checked_in_at,
    registration.checked_in_by,
    registration.checked_in_by_name,
    registration.check_in_method,
    registration.updated_at

  from
    public.event_registrations as registration

  where
    registration.event_id = p_event_id

  order by
    registration.registered_at asc;

end;
$$;

revoke all
on function
public.get_event_operations_roster(uuid)
from public, anon;

grant execute
on function
public.get_event_operations_roster(uuid)
to authenticated;

commit;

notify pgrst, 'reload schema';
