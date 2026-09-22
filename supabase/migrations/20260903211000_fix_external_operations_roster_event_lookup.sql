-- ============================================================
-- CAMPUSCONNECT
-- EXTERNAL OPERATIONS ROSTER EVENT LOOKUP FIX
--
-- Distinguishes:
--   1. event does not exist
--   2. event exists but created_by is NULL
--
-- Keeps the same role permissions and does not weaken RLS.
-- ============================================================

begin;


create or replace function
public.get_external_event_operations_roster(
  p_event_id uuid
)
returns table (
  id uuid,
  event_id uuid,

  full_name text,
  email text,
  phone text,

  college_name text,
  department text,
  graduation_year text,

  fee_amount_paise integer,
  payment_status text,
  registration_status text,

  registered_at timestamptz,

  checked_in boolean,
  checked_in_at timestamptz,
  checked_in_by uuid,

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

  event_exists boolean := false;

begin

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  caller_role :=
    coalesce(
      public.current_campus_role()::text,
      ''
    );


  select
    true,
    campus_event.created_by

  into
    event_exists,
    event_creator

  from
    public.campus_events
      as campus_event

  where
    campus_event.id =
      p_event_id

  limit 1;


  if not coalesce(event_exists, false) then
    raise exception
      'Event not found.';
  end if;


  if not (
    caller_role in (
      'Volunteer',
      'Coordinator',
      'Main Admin'
    )

    or (
      event_creator is not null
      and event_creator = auth.uid()
    )
  ) then

    raise exception
      'You do not have permission to view this event roster.';

  end if;


  return query

  select

    registration.id,

    registration.event_id,

    registration.full_name,

    registration.email,

    registration.phone,

    registration.college_name,

    registration.department,

    registration.graduation_year,

    registration.fee_amount_paise,

    registration.payment_status,

    registration.registration_status,

    registration.registered_at,

    coalesce(
      registration.checked_in,
      false
    ),

    registration.checked_in_at,

    registration.checked_in_by,

    registration.updated_at

  from
    public.external_event_registrations
      as registration

  where
    registration.event_id =
      p_event_id

  order by
    registration.registered_at asc;

end;
$$;


revoke all
on function
public.get_external_event_operations_roster(uuid)
from public, anon;


grant execute
on function
public.get_external_event_operations_roster(uuid)
to authenticated;


commit;

notify pgrst, 'reload schema';
