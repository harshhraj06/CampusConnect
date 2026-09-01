-- ============================================================
-- CAMPUSCONNECT SEVA MANUAL OFFICE CODE
-- Secure camera-free fallback for Resolution Pass verification
-- ============================================================


-- ------------------------------------------------------------
-- INTERNAL CODE GENERATOR
-- Code is derived from the signed pass and is never stored.
-- Example: 7A3F-91C2
-- ------------------------------------------------------------

create or replace function
public.campus_service_resolution_manual_code(
  p_pass_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path =
  public,
  extensions,
  campusconnect_private
as $$
declare
  signed_token_value text;
  code_hash text;
  raw_code text;
begin
  signed_token_value :=
    public
      .campus_service_resolution_pass_token(
        p_pass_id
      );

  if signed_token_value is null then
    return null;
  end if;

  code_hash :=
    encode(
      extensions.digest(
        convert_to(
          signed_token_value ||
          ':campus-seva-manual-code',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );

  raw_code :=
    upper(
      substr(
        code_hash,
        1,
        8
      )
    );

  return
    substr(
      raw_code,
      1,
      4
    ) ||
    '-' ||
    substr(
      raw_code,
      5,
      4
    );
end;
$$;


revoke all
on function
public.campus_service_resolution_manual_code(
  uuid
)
from public;

revoke all
on function
public.campus_service_resolution_manual_code(
  uuid
)
from anon;

revoke all
on function
public.campus_service_resolution_manual_code(
  uuid
)
from authenticated;


-- ------------------------------------------------------------
-- DELIVER CODE TO REQUEST OWNER OR AUTHORIZED STAFF
-- ------------------------------------------------------------

create or replace function
public.get_campus_service_resolution_manual_code(
  p_request_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path =
  public,
  extensions
as $$
declare
  pass_id_value uuid;
  requester_id_value uuid;
  viewer_role_value text;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  select
    pass_row.id,
    request_row.requester_id
  into
    pass_id_value,
    requester_id_value
  from public.campus_service_requests
    request_row
  join public.campus_service_resolution_passes
    pass_row
    on pass_row.request_id =
      request_row.id
  where request_row.id =
    p_request_id;

  if pass_id_value is null then
    raise exception
      'Resolution Pass was not found.';
  end if;

  viewer_role_value :=
    public.campus_service_current_role();

  if requester_id_value <>
       auth.uid()
     and viewer_role_value not in (
       'Faculty',
       'Placement Cell',
       'Coordinator',
       'Volunteer',
       'Main Admin'
     )
  then
    raise exception
      'You cannot access this office code.';
  end if;

  return
    public
      .campus_service_resolution_manual_code(
        pass_id_value
      );
end;
$$;


revoke all
on function
public.get_campus_service_resolution_manual_code(
  uuid
)
from public;

revoke all
on function
public.get_campus_service_resolution_manual_code(
  uuid
)
from anon;

grant execute
on function
public.get_campus_service_resolution_manual_code(
  uuid
)
to authenticated;


-- ------------------------------------------------------------
-- STAFF CODE VERIFICATION
-- ------------------------------------------------------------

create or replace function
public.verify_campus_service_resolution_code(
  p_request_number text,
  p_code text
)
returns table (
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
set search_path =
  public,
  extensions
as $$
declare
  pass_id_value uuid;
  staff_role_value text;
  expected_code text;
  normalized_expected text;
  normalized_provided text;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  staff_role_value :=
    public.campus_service_current_role();

  if staff_role_value not in (
    'Faculty',
    'Placement Cell',
    'Coordinator',
    'Volunteer',
    'Main Admin'
  )
  then
    raise exception
      'Only authorized campus staff can verify an office code.';
  end if;

  select pass_row.id
  into pass_id_value
  from public.campus_service_resolution_passes
    pass_row
  join public.campus_service_requests
    request_row
    on request_row.id =
      pass_row.request_id
  where upper(
    request_row.request_number
  ) = upper(
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

  expected_code :=
    public
      .campus_service_resolution_manual_code(
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
    pass_row
  join public.campus_service_requests
    request_row
    on request_row.id =
      pass_row.request_id
  where pass_row.id =
    pass_id_value;
end;
$$;


revoke all
on function
public.verify_campus_service_resolution_code(
  text,
  text
)
from public;

revoke all
on function
public.verify_campus_service_resolution_code(
  text,
  text
)
from anon;

grant execute
on function
public.verify_campus_service_resolution_code(
  text,
  text
)
to authenticated;


-- ------------------------------------------------------------
-- ONE-TIME FULFILMENT USING REQUEST UID + SHORT CODE
-- ------------------------------------------------------------

create or replace function
public.fulfill_campus_service_resolution_code(
  p_request_number text,
  p_code text
)
returns public.campus_service_requests
language plpgsql
security definer
set search_path =
  public,
  extensions
as $$
declare
  pass_id_value uuid;
  expected_code text;
  normalized_expected text;
  normalized_provided text;
  signed_token_value text;
  completed_request
    public.campus_service_requests%rowtype;
  staff_role_value text;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  staff_role_value :=
    public.campus_service_current_role();

  if staff_role_value not in (
    'Faculty',
    'Placement Cell',
    'Coordinator',
    'Volunteer',
    'Main Admin'
  )
  then
    raise exception
      'Only authorized campus staff can fulfil a Seva pass.';
  end if;

  select pass_row.id
  into pass_id_value
  from public.campus_service_resolution_passes
    pass_row
  join public.campus_service_requests
    request_row
    on request_row.id =
      pass_row.request_id
  where upper(
    request_row.request_number
  ) = upper(
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

  expected_code :=
    public
      .campus_service_resolution_manual_code(
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
    public
      .campus_service_resolution_pass_token(
        pass_id_value
      );

  select *
  into completed_request
  from public
    .fulfill_campus_service_resolution_pass(
      signed_token_value
    );

  return completed_request;
end;
$$;


revoke all
on function
public.fulfill_campus_service_resolution_code(
  text,
  text
)
from public;

revoke all
on function
public.fulfill_campus_service_resolution_code(
  text,
  text
)
from anon;

grant execute
on function
public.fulfill_campus_service_resolution_code(
  text,
  text
)
to authenticated;
