-- ============================================================
-- CAMPUSCONNECT SEVA RESOLUTION PASS
-- Signed QR, approval identity, expiry and one-time fulfilment
-- ============================================================

create extension if not exists pgcrypto;


-- ------------------------------------------------------------
-- APPROVAL IDENTITY
-- ------------------------------------------------------------

alter table
public.campus_service_requests
add column if not exists
approved_at timestamptz;

alter table
public.campus_service_requests
add column if not exists
approved_by uuid
references auth.users(id)
on delete set null;

alter table
public.campus_service_requests
add column if not exists
approved_name text;

alter table
public.campus_service_requests
add column if not exists
approved_role text;


-- ------------------------------------------------------------
-- PRIVATE SIGNING KEY
-- ------------------------------------------------------------

create schema if not exists
campusconnect_private;

revoke all
on schema campusconnect_private
from public;

revoke all
on schema campusconnect_private
from anon;

revoke all
on schema campusconnect_private
from authenticated;


create table if not exists
campusconnect_private.seva_signing_secret (
  singleton boolean primary key
    default true
    check (singleton),

  signing_key bytea
    not null,

  created_at timestamptz
    not null
    default now()
);


insert into
campusconnect_private.seva_signing_secret (
  singleton,
  signing_key
)
values (
  true,
  extensions.gen_random_bytes(32)
)
on conflict (singleton)
do nothing;


-- ------------------------------------------------------------
-- RESOLUTION PASS
-- ------------------------------------------------------------

create table if not exists
public.campus_service_resolution_passes (
  id uuid primary key
    default gen_random_uuid(),

  request_id uuid
    not null
    unique
    references
      public.campus_service_requests(id)
    on delete cascade,

  issued_by uuid
    references auth.users(id)
    on delete set null,

  issued_by_name text
    not null
    default 'Campus staff',

  issued_by_role text
    not null
    default 'CampusConnect',

  issued_at timestamptz
    not null
    default now(),

  expires_at timestamptz
    not null
    default (
      now() +
      interval '30 days'
    ),

  used_at timestamptz,

  used_by uuid
    references auth.users(id)
    on delete set null,

  used_by_name text,

  used_by_role text,

  revoked_at timestamptz,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  check (
    expires_at >
    issued_at
  )
);


create index if not exists
campus_service_resolution_pass_request_idx
on public.campus_service_resolution_passes(
  request_id
);


create index if not exists
campus_service_resolution_pass_expiry_idx
on public.campus_service_resolution_passes(
  expires_at
);


alter table
public.campus_service_resolution_passes
enable row level security;


revoke all
on public.campus_service_resolution_passes
from public;

revoke all
on public.campus_service_resolution_passes
from anon;

revoke all
on public.campus_service_resolution_passes
from authenticated;


-- ------------------------------------------------------------
-- APPROVAL METADATA TRIGGER
-- ------------------------------------------------------------

create or replace function
public.prepare_campus_service_approval()
returns trigger
language plpgsql
security definer
set search_path =
  public,
  extensions
as $$
declare
  actor_name_value text;
  actor_role_value text;
begin
  if new.status = 'Approved'
     and old.status is distinct from
       new.status
  then
    select
      nullif(
        trim(
          p.full_name
        ),
        ''
      ),
      nullif(
        trim(
          p.role::text
        ),
        ''
      )
    into
      actor_name_value,
      actor_role_value
    from public.profiles p
    where p.id = auth.uid()
    limit 1;

    new.approved_at :=
      now();

    new.approved_by :=
      auth.uid();

    new.approved_name :=
      coalesce(
        actor_name_value,
        nullif(
          auth.jwt()
            -> 'user_metadata'
            ->> 'full_name',
          ''
        ),
        new.assigned_name,
        'Campus staff'
      );

    new.approved_role :=
      coalesce(
        actor_role_value,
        public.campus_service_current_role(),
        new.assigned_role,
        'CampusConnect'
      );

    new.closed_at :=
      null;
  end if;

  if new.status = 'Resolved'
     and new.closed_at is null
  then
    new.closed_at :=
      now();
  end if;

  return new;
end;
$$;


drop trigger if exists
prepare_campus_service_approval_trigger
on public.campus_service_requests;


create trigger
prepare_campus_service_approval_trigger
before update of status
on public.campus_service_requests
for each row
execute function
public.prepare_campus_service_approval();


-- ------------------------------------------------------------
-- AUTOMATIC PASS ISSUANCE
-- ------------------------------------------------------------

create or replace function
public.issue_campus_service_resolution_pass()
returns trigger
language plpgsql
security definer
set search_path =
  public,
  extensions
as $$
begin
  if new.status = 'Approved'
     and old.status is distinct from
       new.status
  then
    insert into
    public.campus_service_resolution_passes (
      request_id,
      issued_by,
      issued_by_name,
      issued_by_role,
      issued_at,
      expires_at
    )
    values (
      new.id,
      new.approved_by,
      coalesce(
        new.approved_name,
        'Campus staff'
      ),
      coalesce(
        new.approved_role,
        new.assigned_role,
        'CampusConnect'
      ),
      coalesce(
        new.approved_at,
        now()
      ),
      coalesce(
        new.approved_at,
        now()
      ) + interval '30 days'
    )
    on conflict (request_id)
    do update set
      id =
        gen_random_uuid(),
      issued_by =
        excluded.issued_by,
      issued_by_name =
        excluded.issued_by_name,
      issued_by_role =
        excluded.issued_by_role,
      issued_at =
        excluded.issued_at,
      expires_at =
        excluded.expires_at,
      used_at =
        null,
      used_by =
        null,
      used_by_name =
        null,
      used_by_role =
        null,
      revoked_at =
        null,
      updated_at =
        now();

    insert into
    public.campus_service_events (
      request_id,
      actor_id,
      actor_name,
      actor_role,
      event_type,
      message
    )
    values (
      new.id,
      new.approved_by,
      coalesce(
        new.approved_name,
        'Campus staff'
      ),
      coalesce(
        new.approved_role,
        'CampusConnect'
      ),
      'resolution_pass_issued',
      'Seva Resolution Pass and secure QR are ready.'
    );
  end if;

  return new;
end;
$$;


drop trigger if exists
issue_campus_service_resolution_pass_trigger
on public.campus_service_requests;


create trigger
issue_campus_service_resolution_pass_trigger
after update of status
on public.campus_service_requests
for each row
execute function
public.issue_campus_service_resolution_pass();


-- ------------------------------------------------------------
-- INTERNAL SIGNED TOKEN
-- Token is recomputed when required and is never stored.
-- ------------------------------------------------------------

create or replace function
public.campus_service_resolution_pass_token(
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
  pass_record record;
  signing_key_value bytea;
  token_payload text;
  token_signature text;
begin
  select
    pass_row.id,
    pass_row.request_id,
    pass_row.issued_at
  into pass_record
  from public.campus_service_resolution_passes
    pass_row
  where pass_row.id =
    p_pass_id;

  if not found then
    return null;
  end if;

  select secret.signing_key
  into signing_key_value
  from campusconnect_private
    .seva_signing_secret secret
  where secret.singleton
  limit 1;

  if signing_key_value is null then
    raise exception
      'Campus Seva signing key is unavailable.';
  end if;

  token_payload :=
    pass_record.id::text ||
    ':' ||
    pass_record.request_id::text ||
    ':' ||
    extract(
      epoch from
      pass_record.issued_at
    )::bigint::text;

  token_signature :=
    encode(
      hmac(
        convert_to(
          token_payload,
          'UTF8'
        ),
        signing_key_value,
        'sha256'
      ),
      'hex'
    );

  return
    pass_record.id::text ||
    '.' ||
    token_signature;
end;
$$;


revoke all
on function
public.campus_service_resolution_pass_token(
  uuid
)
from public;

revoke all
on function
public.campus_service_resolution_pass_token(
  uuid
)
from anon;

revoke all
on function
public.campus_service_resolution_pass_token(
  uuid
)
from authenticated;


-- ------------------------------------------------------------
-- INTERNAL TOKEN VALIDATION
-- ------------------------------------------------------------

create or replace function
public.validate_campus_service_resolution_token(
  p_token text
)
returns uuid
language plpgsql
stable
security definer
set search_path =
  public,
  extensions,
  campusconnect_private
as $$
declare
  pass_id_value uuid;
  expected_token text;
begin
  if p_token is null
     or p_token !~
       '^[0-9a-fA-F-]{36}\.[0-9a-fA-F]{64}$'
  then
    return null;
  end if;

  begin
    pass_id_value :=
      split_part(
        trim(p_token),
        '.',
        1
      )::uuid;
  exception
    when others then
      return null;
  end;

  expected_token :=
    public
      .campus_service_resolution_pass_token(
        pass_id_value
      );

  if expected_token is null
     or lower(expected_token) <>
       lower(trim(p_token))
  then
    return null;
  end if;

  return pass_id_value;
end;
$$;


revoke all
on function
public.validate_campus_service_resolution_token(
  text
)
from public;

revoke all
on function
public.validate_campus_service_resolution_token(
  text
)
from anon;

revoke all
on function
public.validate_campus_service_resolution_token(
  text
)
from authenticated;


-- ------------------------------------------------------------
-- STUDENT PASS DELIVERY RPC
-- ------------------------------------------------------------

create or replace function
public.get_campus_service_resolution_pass(
  p_request_id uuid
)
returns table (
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
set search_path =
  public,
  extensions
as $$
declare
  requester_id_value uuid;
  viewer_role_value text;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  select request_row.requester_id
  into requester_id_value
  from public.campus_service_requests
    request_row
  where request_row.id =
    p_request_id;

  if requester_id_value is null then
    raise exception
      'Campus Seva request was not found.';
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
    public
      .campus_service_resolution_pass_token(
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
    pass_row
  join public.campus_service_requests
    request_row
    on request_row.id =
      pass_row.request_id
  where request_row.id =
    p_request_id;
end;
$$;


revoke all
on function
public.get_campus_service_resolution_pass(
  uuid
)
from public;

revoke all
on function
public.get_campus_service_resolution_pass(
  uuid
)
from anon;

grant execute
on function
public.get_campus_service_resolution_pass(
  uuid
)
to authenticated;


-- ------------------------------------------------------------
-- VERIFY QR RPC
-- ------------------------------------------------------------

create or replace function
public.verify_campus_service_resolution_pass(
  p_token text
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
  validated_pass_id uuid;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  validated_pass_id :=
    public
      .validate_campus_service_resolution_token(
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
    validated_pass_id;
end;
$$;


revoke all
on function
public.verify_campus_service_resolution_pass(
  text
)
from public;

revoke all
on function
public.verify_campus_service_resolution_pass(
  text
)
from anon;

grant execute
on function
public.verify_campus_service_resolution_pass(
  text
)
to authenticated;


-- ------------------------------------------------------------
-- STAFF FULFILMENT RPC
-- ------------------------------------------------------------

create or replace function
public.fulfill_campus_service_resolution_pass(
  p_token text
)
returns public.campus_service_requests
language plpgsql
security definer
set search_path =
  public,
  extensions
as $$
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

  validated_pass_id :=
    public
      .validate_campus_service_resolution_token(
        p_token
      );

  if validated_pass_id is null then
    raise exception
      'This Seva QR is invalid.';
  end if;

  select pass_row.*
  into pass_record
  from public.campus_service_resolution_passes
    pass_row
  where pass_row.id =
    validated_pass_id
  for update;

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

  select
    coalesce(
      nullif(
        trim(
          profile.full_name
        ),
        ''
      ),
      nullif(
        auth.jwt()
          -> 'user_metadata'
          ->> 'full_name',
        ''
      ),
      'Campus staff'
    )
  into staff_name_value
  from public.profiles profile
  where profile.id =
    auth.uid()
  limit 1;

  staff_name_value :=
    coalesce(
      staff_name_value,
      'Campus staff'
    );

  update
  public.campus_service_resolution_passes
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
  where id =
    validated_pass_id;

  update
  public.campus_service_requests
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
  where id =
    pass_record.request_id
  returning *
  into completed_request;

  insert into
  public.campus_service_events (
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

  return completed_request;
end;
$$;


revoke all
on function
public.fulfill_campus_service_resolution_pass(
  text
)
from public;

revoke all
on function
public.fulfill_campus_service_resolution_pass(
  text
)
from anon;

grant execute
on function
public.fulfill_campus_service_resolution_pass(
  text
)
to authenticated;


-- ------------------------------------------------------------
-- EXISTING APPROVED REQUEST BACKFILL
-- ------------------------------------------------------------

update public.campus_service_requests
set
  approved_at =
    coalesce(
      approved_at,
      updated_at,
      created_at
    ),
  approved_by =
    coalesce(
      approved_by,
      assigned_to
    ),
  approved_name =
    coalesce(
      approved_name,
      assigned_name,
      'Campus staff'
    ),
  approved_role =
    coalesce(
      approved_role,
      assigned_role,
      'CampusConnect'
    )
where status in (
  'Approved',
  'Resolved'
)
and approved_at is null;


insert into
public.campus_service_resolution_passes (
  request_id,
  issued_by,
  issued_by_name,
  issued_by_role,
  issued_at,
  expires_at
)
select
  request_row.id,
  request_row.approved_by,
  coalesce(
    request_row.approved_name,
    'Campus staff'
  ),
  coalesce(
    request_row.approved_role,
    request_row.assigned_role,
    'CampusConnect'
  ),
  coalesce(
    request_row.approved_at,
    request_row.updated_at
  ),
  greatest(
    coalesce(
      request_row.approved_at,
      request_row.updated_at
    ) + interval '30 days',
    now() + interval '7 days'
  )
from public.campus_service_requests
  request_row
where request_row.status =
  'Approved'
on conflict (request_id)
do nothing;
