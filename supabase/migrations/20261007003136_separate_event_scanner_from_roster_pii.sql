create or replace function public.can_scan_event_pass(
  p_event_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to
  'pg_catalog',
  'public'
as $function$
  select
    auth.uid() is not null

    and exists (
      select 1
      from public.profiles
        as profile
      where
        profile.id =
          auth.uid()

        and coalesce(
          profile.account_status::text,
          'Active'
        ) = 'Active'
    )

    and exists (
      select 1
      from public.campus_events
        as event
      where
        event.id =
          p_event_id
    )

    and (
      coalesce(
        public.current_campus_role()::text,
        ''
      ) = 'Main Admin'

      or exists (
        select 1
        from public.campus_events
          as event
        where
          event.id =
            p_event_id

          and event.created_by =
            auth.uid()
      )

      or public.has_campus_delegated_access(
        'EVENT_SCAN',
        p_event_id
      )
    );
$function$;


create or replace function public.can_view_event_roster(
  p_event_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to
  'pg_catalog',
  'public'
as $function$
  select
    auth.uid() is not null

    and exists (
      select 1
      from public.profiles
        as profile
      where
        profile.id =
          auth.uid()

        and coalesce(
          profile.account_status::text,
          'Active'
        ) = 'Active'
    )

    and exists (
      select 1
      from public.campus_events
        as event
      where
        event.id =
          p_event_id

        and (
          event.created_by =
            auth.uid()

          or coalesce(
            public.current_campus_role()::text,
            ''
          ) = 'Main Admin'
        )
    );
$function$;


create or replace function public.get_event_organizer_roster(
  p_event_id uuid
)
returns table(
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
set search_path to
  'pg_catalog',
  'public'
as $function$
begin
  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;

  if not public.can_view_event_roster(
    p_event_id
  ) then
    raise exception
      'You do not have permission to view this event roster.';
  end if;

  return query
  select
    roster.id,
    roster.event_id,
    roster.student_id,
    roster.student_name,
    roster.student_email,
    roster.department,
    roster.graduation_year,
    roster.status,
    roster.registered_at,
    roster.checked_in,
    roster.checked_in_at,
    roster.checked_in_by,
    roster.checked_in_by_name,
    roster.check_in_method,
    roster.updated_at
  from public.get_event_operations_roster(
    p_event_id
  ) as roster;
end;
$function$;


create or replace function public.get_external_event_organizer_roster(
  p_event_id uuid
)
returns table(
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
set search_path to
  'pg_catalog',
  'public'
as $function$
begin
  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;

  if not public.can_view_event_roster(
    p_event_id
  ) then
    raise exception
      'You do not have permission to view this event roster.';
  end if;

  return query
  select
    roster.id,
    roster.event_id,
    roster.full_name,
    roster.email,
    roster.phone,
    roster.college_name,
    roster.department,
    roster.graduation_year,
    roster.fee_amount_paise,
    roster.payment_status,
    roster.registration_status,
    roster.registered_at,
    roster.checked_in,
    roster.checked_in_at,
    roster.checked_in_by,
    roster.updated_at
  from public.get_external_event_operations_roster(
    p_event_id
  ) as roster;
end;
$function$;


create or replace function public.get_event_checkin_summary(
  p_event_id uuid
)
returns table(
  registered_count bigint,
  checked_in_count bigint,
  waiting_count bigint
)
language plpgsql
stable
security definer
set search_path to
  'pg_catalog',
  'public'
as $function$
declare
  registered_value bigint := 0;
  checked_in_value bigint := 0;
begin
  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;

  if not public.can_scan_event_pass(
    p_event_id
  ) then
    raise exception
      'You are not authorized to scan passes for this event.';
  end if;

  select
    (
      select count(*)
      from public.event_registrations
        as registration
      where
        registration.event_id =
          p_event_id
        and registration.status =
          'Going'
    )
    +
    (
      select count(*)
      from public.external_event_registrations
        as registration
      where
        registration.event_id =
          p_event_id
        and registration.registration_status =
          'Confirmed'
    )
  into
    registered_value;

  select
    (
      select count(*)
      from public.event_registrations
        as registration
      where
        registration.event_id =
          p_event_id
        and registration.status =
          'Going'
        and coalesce(
          registration.checked_in,
          false
        ) = true
    )
    +
    (
      select count(*)
      from public.external_event_registrations
        as registration
      where
        registration.event_id =
          p_event_id
        and registration.registration_status =
          'Confirmed'
        and coalesce(
          registration.checked_in,
          false
        ) = true
    )
  into
    checked_in_value;

  return query
  select
    registered_value,
    checked_in_value,
    greatest(
      registered_value -
      checked_in_value,
      0::bigint
    );
end;
$function$;


revoke execute on function
public.can_scan_event_pass(uuid)
from public, anon;

revoke execute on function
public.can_view_event_roster(uuid)
from public, anon;

revoke execute on function
public.get_event_organizer_roster(uuid)
from public, anon;

revoke execute on function
public.get_external_event_organizer_roster(uuid)
from public, anon;

revoke execute on function
public.get_event_checkin_summary(uuid)
from public, anon;

grant execute on function
public.can_scan_event_pass(uuid)
to authenticated, service_role;

grant execute on function
public.can_view_event_roster(uuid)
to authenticated, service_role;

grant execute on function
public.get_event_organizer_roster(uuid)
to authenticated, service_role;

grant execute on function
public.get_external_event_organizer_roster(uuid)
to authenticated, service_role;

grant execute on function
public.get_event_checkin_summary(uuid)
to authenticated, service_role;


revoke execute on function
public.get_event_operations_roster(uuid)
from public, anon, authenticated;

revoke execute on function
public.get_external_event_operations_roster(uuid)
from public, anon, authenticated;

revoke execute on function
public.get_event_operations_summary(uuid)
from public, anon, authenticated;

grant execute on function
public.get_event_operations_roster(uuid)
to service_role;

grant execute on function
public.get_external_event_operations_roster(uuid)
to service_role;

grant execute on function
public.get_event_operations_summary(uuid)
to service_role;

notify pgrst, 'reload schema';
