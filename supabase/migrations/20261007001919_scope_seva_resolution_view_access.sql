create or replace function public.campus_service_can_access_request(
  target_request_id uuid
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
      from public.campus_service_requests
        as request
      where
        request.id =
          target_request_id

        and (
          request.requester_id =
            auth.uid()

          or public.campus_service_current_role() =
            'Main Admin'

          or request.assigned_to =
            auth.uid()

          or (
            request.assigned_to is null

            and request.assigned_role =
              public.campus_service_current_role()

            and public.campus_service_current_role()
              in (
                'Faculty',
                'Placement Cell',
                'Coordinator',
                'Volunteer'
              )
          )

          or public.has_campus_delegated_access(
            'SEVA_PROCESS',
            request.id
          )
        )
    );
$function$;

revoke execute on function
public.campus_service_can_access_request(
  uuid
)
from public, anon;

grant execute on function
public.campus_service_can_access_request(
  uuid
)
to authenticated, service_role;


create or replace function public.get_campus_service_resolution_manual_code(
  p_request_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path to
  'pg_catalog',
  'public',
  'extensions'
as $function$
declare
  pass_id_value uuid;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.campus_service_can_access_request(
    p_request_id
  ) then
    raise exception
      'You cannot access this office code.';
  end if;

  select
    pass_row.id
  into
    pass_id_value
  from public.campus_service_resolution_passes
    as pass_row
  where
    pass_row.request_id =
      p_request_id;

  if pass_id_value is null then
    raise exception
      'Resolution Pass was not found.';
  end if;

  return
    public.campus_service_resolution_manual_code(
      pass_id_value
    );
end;
$function$;


create or replace function public.get_campus_service_resolution_pass(
  p_request_id uuid
)
returns table(
  pass_id uuid,
  request_id uuid,
  request_number text,
  requester_name text,
  requester_role text,
  department text,
  category text,
  subject text,
  description text,
  priority text,
  request_status text,
  resolution_note text,
  approved_at timestamptz,
  approved_name text,
  approved_role text,
  issued_at timestamptz,
  expires_at timestamptz,
  used_at timestamptz,
  used_by_name text,
  used_by_role text,
  qr_token text,
  qr_state text
)
language plpgsql
stable
security definer
set search_path to
  'pg_catalog',
  'public',
  'extensions'
as $function$
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.campus_service_can_access_request(
    p_request_id
  ) then
    raise exception
      'You cannot access this resolution pass.';
  end if;

  return query
  select
    pass_row.id,
    request_row.id,
    request_row.request_number,
    request_row.requester_name,
    request_row.requester_role,
    request_row.department,
    request_row.category,
    request_row.subject,
    request_row.description,
    request_row.priority,
    request_row.status,
    request_row.resolution_note,
    request_row.approved_at,
    request_row.approved_name,
    request_row.approved_role,
    pass_row.issued_at,
    pass_row.expires_at,
    pass_row.used_at,
    pass_row.used_by_name,
    pass_row.used_by_role,
    public.campus_service_resolution_pass_token(
      pass_row.id
    ),
    case
      when pass_row.revoked_at is not null
        then 'Revoked'
      when pass_row.used_at is not null
        then 'Used'
      when pass_row.expires_at <= now()
        then 'Expired'
      else 'Ready'
    end
  from public.campus_service_resolution_passes
    as pass_row
  join public.campus_service_requests
    as request_row
      on request_row.id =
         pass_row.request_id
  where
    request_row.id =
      p_request_id;
end;
$function$;


revoke execute on function
public.get_campus_service_resolution_manual_code(
  uuid
)
from public, anon;

revoke execute on function
public.get_campus_service_resolution_pass(
  uuid
)
from public, anon;

grant execute on function
public.get_campus_service_resolution_manual_code(
  uuid
)
to authenticated, service_role;

grant execute on function
public.get_campus_service_resolution_pass(
  uuid
)
to authenticated, service_role;

notify pgrst, 'reload schema';
