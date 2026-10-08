create or replace function public.campus_service_can_process_request(
  p_request_id uuid
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

    and public.campus_service_current_role()
      in (
        'Faculty',
        'Placement Cell',
        'Coordinator',
        'Volunteer',
        'Main Admin'
      )

    and exists (
      select 1
      from public.campus_service_requests
        as request
      where
        request.id =
          p_request_id

        and (
          public.campus_service_current_role() =
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
public.campus_service_can_process_request(
  uuid
)
from public, anon;

grant execute on function
public.campus_service_can_process_request(
  uuid
)
to authenticated, service_role;


create or replace function public.verify_campus_service_resolution_pass(
  p_token text
)
returns table(
  valid boolean,
  verification_state text,
  pass_id uuid,
  request_id uuid,
  request_number text,
  requester_name text,
  department text,
  category text,
  subject text,
  approved_at timestamptz,
  approved_name text,
  approved_role text,
  expires_at timestamptz,
  used_at timestamptz,
  used_by_name text
)
language plpgsql
stable
security definer
set search_path to
  'pg_catalog',
  'public',
  'extensions'
as $function$
declare
  validated_pass_id uuid;
  request_id_value uuid;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  validated_pass_id :=
    public.validate_campus_service_resolution_token(
      p_token
    );

  if validated_pass_id is null then
    return query
    select
      false,
      'Invalid'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::timestamptz,
      null::text,
      null::text,
      null::timestamptz,
      null::timestamptz,
      null::text;

    return;
  end if;

  select
    pass_row.request_id
  into
    request_id_value
  from public.campus_service_resolution_passes
    as pass_row
  where
    pass_row.id =
      validated_pass_id;

  if request_id_value is null
     or not public.campus_service_can_process_request(
       request_id_value
     )
  then
    raise exception
      'You are not authorized to process this Campus Seva request.';
  end if;

  return query
  select
    true,
    case
      when pass_row.revoked_at is not null
        then 'Revoked'
      when pass_row.used_at is not null
        then 'Used'
      when pass_row.expires_at <= now()
        then 'Expired'
      else 'Ready'
    end,
    pass_row.id,
    request_row.id,
    request_row.request_number,
    request_row.requester_name,
    request_row.department,
    request_row.category,
    request_row.subject,
    request_row.approved_at,
    request_row.approved_name,
    request_row.approved_role,
    pass_row.expires_at,
    pass_row.used_at,
    pass_row.used_by_name
  from public.campus_service_resolution_passes
    as pass_row
  join public.campus_service_requests
    as request_row
      on request_row.id =
         pass_row.request_id
  where
    pass_row.id =
      validated_pass_id;
end;
$function$;


create or replace function public.verify_campus_service_resolution_code(
  p_request_number text,
  p_code text
)
returns table(
  valid boolean,
  verification_state text,
  pass_id uuid,
  request_id uuid,
  request_number text,
  requester_name text,
  department text,
  category text,
  subject text,
  approved_at timestamptz,
  approved_name text,
  approved_role text,
  expires_at timestamptz,
  used_at timestamptz,
  used_by_name text
)
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
  request_id_value uuid;
  expected_code text;
  normalized_expected text;
  normalized_provided text;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  select
    pass_row.id,
    request_row.id
  into
    pass_id_value,
    request_id_value
  from public.campus_service_resolution_passes
    as pass_row
  join public.campus_service_requests
    as request_row
      on request_row.id =
         pass_row.request_id
  where
    upper(request_row.request_number) =
    upper(
      trim(
        coalesce(
          p_request_number,
          ''
        )
      )
    )
  limit 1;

  if pass_id_value is null then
    return query
    select
      false,
      'Invalid'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::timestamptz,
      null::text,
      null::text,
      null::timestamptz,
      null::timestamptz,
      null::text;

    return;
  end if;

  if not public.campus_service_can_process_request(
    request_id_value
  ) then
    raise exception
      'You are not authorized to process this Campus Seva request.';
  end if;

  expected_code :=
    public.campus_service_resolution_manual_code(
      pass_id_value
    );

  normalized_expected :=
    replace(
      upper(
        coalesce(
          expected_code,
          ''
        )
      ),
      '-',
      ''
    );

  normalized_provided :=
    replace(
      replace(
        upper(
          trim(
            coalesce(
              p_code,
              ''
            )
          )
        ),
        '-',
        ''
      ),
      ' ',
      ''
    );

  if normalized_expected = ''
     or normalized_expected <>
       normalized_provided
  then
    return query
    select
      false,
      'Invalid'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::timestamptz,
      null::text,
      null::text,
      null::timestamptz,
      null::timestamptz,
      null::text;

    return;
  end if;

  return query
  select
    true,
    case
      when pass_row.revoked_at is not null
        then 'Revoked'
      when pass_row.used_at is not null
        then 'Used'
      when pass_row.expires_at <= now()
        then 'Expired'
      else 'Ready'
    end,
    pass_row.id,
    request_row.id,
    request_row.request_number,
    request_row.requester_name,
    request_row.department,
    request_row.category,
    request_row.subject,
    request_row.approved_at,
    request_row.approved_name,
    request_row.approved_role,
    pass_row.expires_at,
    pass_row.used_at,
    pass_row.used_by_name
  from public.campus_service_resolution_passes
    as pass_row
  join public.campus_service_requests
    as request_row
      on request_row.id =
         pass_row.request_id
  where
    pass_row.id =
      pass_id_value;
end;
$function$;


create or replace function public.fulfill_campus_service_resolution_pass(
  p_token text
)
returns public.campus_service_requests
language plpgsql
security definer
set search_path to
  'pg_catalog',
  'public',
  'extensions'
as $function$
declare
  validated_pass_id uuid;

  pass_record
    public.campus_service_resolution_passes%rowtype;

  completed_request
    public.campus_service_requests%rowtype;

  staff_role_value text;
  staff_name_value text;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  validated_pass_id :=
    public.validate_campus_service_resolution_token(
      p_token
    );

  if validated_pass_id is null then
    raise exception
      'This Seva QR is invalid.';
  end if;

  select
    pass_row.*
  into
    pass_record
  from public.campus_service_resolution_passes
    as pass_row
  where
    pass_row.id =
      validated_pass_id
  for update;

  if not found then
    raise exception
      'This Seva QR is invalid.';
  end if;

  if not public.campus_service_can_process_request(
    pass_record.request_id
  ) then
    raise exception
      'You are not authorized to process this Campus Seva request.';
  end if;

  if pass_record.revoked_at is not null then
    raise exception
      'This Seva QR has been revoked.';
  end if;

  if pass_record.used_at is not null then
    raise exception
      'This Seva QR has already been used.';
  end if;

  if pass_record.expires_at <= now() then
    raise exception
      'This Seva QR has expired.';
  end if;

  staff_role_value :=
    public.campus_service_current_role();

  select
    coalesce(
      nullif(
        trim(profile.full_name),
        ''
      ),
      'Campus staff'
    )
  into
    staff_name_value
  from public.profiles
    as profile
  where
    profile.id =
      auth.uid()
  limit 1;

  staff_name_value :=
    coalesce(
      staff_name_value,
      'Campus staff'
    );

  update public.campus_service_resolution_passes
  set
    used_at =
      now(),
    used_by =
      auth.uid(),
    used_by_name =
      staff_name_value,
    used_by_role =
      staff_role_value,
    updated_at =
      now()
  where
    id =
      validated_pass_id;

  update public.campus_service_requests
  set
    status =
      'Resolved',
    closed_at =
      now(),
    resolution_note =
      case
        when trim(
          coalesce(
            resolution_note,
            ''
          )
        ) = ''
        then
          'Service fulfilled after authorized office QR verification.'
        else
          resolution_note
      end
  where
    id =
      pass_record.request_id
  returning *
  into
    completed_request;

  insert into public.campus_service_events (
    request_id,
    actor_id,
    actor_name,
    actor_role,
    event_type,
    message
  )
  values (
    pass_record.request_id,
    auth.uid(),
    staff_name_value,
    staff_role_value,
    'resolution_pass_fulfilled',
    'Service fulfilled through authorized office QR verification.'
  );

  return
    completed_request;
end;
$function$;


create or replace function public.fulfill_campus_service_resolution_code(
  p_request_number text,
  p_code text
)
returns public.campus_service_requests
language plpgsql
security definer
set search_path to
  'pg_catalog',
  'public',
  'extensions'
as $function$
declare
  pass_id_value uuid;
  request_id_value uuid;
  expected_code text;
  normalized_expected text;
  normalized_provided text;
  signed_token_value text;

  completed_request
    public.campus_service_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  select
    pass_row.id,
    request_row.id
  into
    pass_id_value,
    request_id_value
  from public.campus_service_resolution_passes
    as pass_row
  join public.campus_service_requests
    as request_row
      on request_row.id =
         pass_row.request_id
  where
    upper(request_row.request_number) =
    upper(
      trim(
        coalesce(
          p_request_number,
          ''
        )
      )
    )
  limit 1;

  if pass_id_value is null then
    raise exception
      'Request UID or office code is incorrect.';
  end if;

  if not public.campus_service_can_process_request(
    request_id_value
  ) then
    raise exception
      'You are not authorized to process this Campus Seva request.';
  end if;

  expected_code :=
    public.campus_service_resolution_manual_code(
      pass_id_value
    );

  normalized_expected :=
    replace(
      upper(
        coalesce(
          expected_code,
          ''
        )
      ),
      '-',
      ''
    );

  normalized_provided :=
    replace(
      replace(
        upper(
          trim(
            coalesce(
              p_code,
              ''
            )
          )
        ),
        '-',
        ''
      ),
      ' ',
      ''
    );

  if normalized_expected = ''
     or normalized_expected <>
       normalized_provided
  then
    raise exception
      'Request UID or office code is incorrect.';
  end if;

  signed_token_value :=
    public.campus_service_resolution_pass_token(
      pass_id_value
    );

  select *
  into
    completed_request
  from public.fulfill_campus_service_resolution_pass(
    signed_token_value
  );

  return
    completed_request;
end;
$function$;


revoke execute on function
public.verify_campus_service_resolution_pass(
  text
)
from public, anon;

revoke execute on function
public.verify_campus_service_resolution_code(
  text,
  text
)
from public, anon;

revoke execute on function
public.fulfill_campus_service_resolution_pass(
  text
)
from public, anon;

revoke execute on function
public.fulfill_campus_service_resolution_code(
  text,
  text
)
from public, anon;


grant execute on function
public.verify_campus_service_resolution_pass(
  text
)
to authenticated, service_role;

grant execute on function
public.verify_campus_service_resolution_code(
  text,
  text
)
to authenticated, service_role;

grant execute on function
public.fulfill_campus_service_resolution_pass(
  text
)
to authenticated, service_role;

grant execute on function
public.fulfill_campus_service_resolution_code(
  text,
  text
)
to authenticated, service_role;

notify pgrst, 'reload schema';
