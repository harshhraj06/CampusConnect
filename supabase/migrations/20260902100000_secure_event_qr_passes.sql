-- ============================================================
-- CAMPUSCONNECT SECURE EVENT QR PASSES
-- Signed passes, manual fallback, revocation and atomic check-in
-- ============================================================

begin;

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass(
    'public.campus_events'
  ) is null then
    raise exception
      'public.campus_events does not exist.';
  end if;

  if to_regclass(
    'public.event_registrations'
  ) is null then
    raise exception
      'public.event_registrations does not exist.';
  end if;
end;
$$;


-- ------------------------------------------------------------
-- ADDITIVE PASS FIELDS
-- Existing check-in fields are preserved for compatibility.
-- ------------------------------------------------------------

alter table
  public.event_registrations
add column if not exists
  event_pass_uid uuid
  not null
  default gen_random_uuid();

alter table
  public.event_registrations
add column if not exists
  event_pass_version integer
  not null
  default 1;

alter table
  public.event_registrations
add column if not exists
  event_pass_issued_at timestamptz
  not null
  default now();

alter table
  public.event_registrations
add column if not exists
  event_pass_revoked_at timestamptz;

alter table
  public.event_registrations
add column if not exists
  event_pass_revoked_by uuid
  references auth.users(id)
  on delete set null;

alter table
  public.event_registrations
add column if not exists
  checked_in_by_name text;

alter table
  public.event_registrations
add column if not exists
  check_in_method text;

create unique index if not exists
  event_registrations_pass_uid_idx
on public.event_registrations(
  event_pass_uid
);


-- ------------------------------------------------------------
-- PRIVATE SIGNING SECRET
-- Uses digest-based entropy because gen_random_bytes is not
-- available in this Supabase project.
-- ------------------------------------------------------------

create schema if not exists
  campusconnect_private;

revoke all
on schema campusconnect_private
from public;

create table if not exists
  campusconnect_private.event_pass_secret (
    singleton boolean
      primary key
      default true
      check (singleton),

    signing_key bytea
      not null,

    created_at timestamptz
      not null
      default now()
  );

revoke all
on campusconnect_private.event_pass_secret
from public, anon, authenticated;

insert into
  campusconnect_private.event_pass_secret (
    singleton,
    signing_key
  )
values (
  true,
  decode(
    md5(
      gen_random_uuid()::text ||
      clock_timestamp()::text ||
      random()::text
    ) ||
    md5(
      random()::text ||
      gen_random_uuid()::text ||
      clock_timestamp()::text
    ),
    'hex'
  )
)
on conflict (singleton)
do nothing;


-- ------------------------------------------------------------
-- SERVER-SIDE SIGNATURE
-- ------------------------------------------------------------

create or replace function
  campusconnect_private.event_pass_signature(
    p_registration_id uuid,
    p_event_id uuid,
    p_student_id uuid,
    p_version integer
  )
returns text
language sql
stable
security definer
set search_path =
  pg_catalog,
  public,
  extensions,
  campusconnect_private
as $$
  select encode(
    hmac(
      convert_to(
        concat_ws(
          ':',
          'CCEV1',
          p_registration_id::text,
          p_event_id::text,
          p_student_id::text,
          p_version::text
        ),
        'UTF8'
      ),
      secret.signing_key,
      'sha256'
    ),
    'hex'
  )
  from
    campusconnect_private.event_pass_secret
      as secret
  where
    secret.singleton = true;
$$;

revoke all
on function
  campusconnect_private.event_pass_signature(
    uuid,
    uuid,
    uuid,
    integer
  )
from public, anon, authenticated;


-- ------------------------------------------------------------
-- SCAN AUDIT HISTORY
-- No complete QR token is stored.
-- ------------------------------------------------------------

create table if not exists
  public.event_pass_scans (
    id uuid
      primary key
      default gen_random_uuid(),

    event_id uuid
      references public.campus_events(id)
      on delete set null,

    registration_id uuid
      references public.event_registrations(id)
      on delete set null,

    scanned_by uuid
      references auth.users(id)
      on delete set null,

    scanner_name text
      not null
      default 'Campus staff',

    scan_method text
      not null
      default 'QR',

    outcome text
      not null,

    token_fingerprint text
      not null
      default '',

    created_at timestamptz
      not null
      default now()
  );

create index if not exists
  event_pass_scans_event_idx
on public.event_pass_scans(
  event_id,
  created_at desc
);

create index if not exists
  event_pass_scans_registration_idx
on public.event_pass_scans(
  registration_id,
  created_at desc
);

alter table
  public.event_pass_scans
enable row level security;

revoke insert, update, delete
on public.event_pass_scans
from authenticated;

grant select
on public.event_pass_scans
to authenticated;

drop policy if exists
  "event_pass_scans_authorized_read"
on public.event_pass_scans;

create policy
  "event_pass_scans_authorized_read"
on public.event_pass_scans
for select
to authenticated
using (
  scanned_by = auth.uid()

  or exists (
    select 1
    from public.event_registrations registration
    where
      registration.id =
        event_pass_scans.registration_id
      and registration.student_id =
        auth.uid()
  )

  or coalesce(
    public.current_campus_role()::text,
    ''
  ) in (
    'Main Admin',
    'Coordinator'
  )

  or exists (
    select 1
    from public.campus_events event
    where
      event.id =
        event_pass_scans.event_id
      and event.created_by =
        auth.uid()
  )
);


-- ------------------------------------------------------------
-- AUDIT WRITER
-- ------------------------------------------------------------

create or replace function
  campusconnect_private.record_event_pass_scan(
    p_event_id uuid,
    p_registration_id uuid,
    p_method text,
    p_outcome text,
    p_fingerprint text,
    p_scanner_name text
  )
returns void
language plpgsql
security definer
set search_path =
  pg_catalog,
  public,
  extensions,
  campusconnect_private
as $$
begin
  insert into
    public.event_pass_scans (
      event_id,
      registration_id,
      scanned_by,
      scanner_name,
      scan_method,
      outcome,
      token_fingerprint
    )
  values (
    p_event_id,
    p_registration_id,
    auth.uid(),
    coalesce(
      nullif(trim(p_scanner_name), ''),
      'Campus staff'
    ),
    p_method,
    p_outcome,
    p_fingerprint
  );
end;
$$;

revoke all
on function
  campusconnect_private.record_event_pass_scan(
    uuid,
    uuid,
    text,
    text,
    text,
    text
  )
from public, anon, authenticated;


-- ------------------------------------------------------------
-- PASS ROTATION
-- Cancelling invalidates the pass. Registering again creates
-- a new UID and signature and resets previous check-in state.
-- ------------------------------------------------------------

create or replace function
  public.rotate_event_pass_on_status_change()
returns trigger
language plpgsql
security definer
set search_path =
  pg_catalog,
  public,
  extensions
as $$
begin
  if old.status is distinct from new.status then
    if new.status = 'Cancelled' then
      new.event_pass_revoked_at :=
        coalesce(
          new.event_pass_revoked_at,
          now()
        );

    elsif new.status = 'Going'
      and old.status = 'Cancelled'
    then
      new.event_pass_uid :=
        gen_random_uuid();

      new.event_pass_version :=
        greatest(
          coalesce(
            old.event_pass_version,
            1
          ) + 1,
          2
        );

      new.event_pass_issued_at :=
        now();

      new.event_pass_revoked_at :=
        null;

      new.event_pass_revoked_by :=
        null;

      new.checked_in :=
        false;

      new.checked_in_at :=
        null;

      new.checked_in_by :=
        null;

      new.checked_in_by_name :=
        null;

      new.check_in_method :=
        null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists
  rotate_event_pass_status_trigger
on public.event_registrations;

create trigger
  rotate_event_pass_status_trigger
before update of status
on public.event_registrations
for each row
execute function
  public.rotate_event_pass_on_status_change();


-- ------------------------------------------------------------
-- STUDENT: RECEIVE OWN SIGNED PASS
-- ------------------------------------------------------------

create or replace function
  public.get_my_event_pass(
    p_event_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path =
  pg_catalog,
  public,
  extensions,
  campusconnect_private
as $$
declare
  registration_row
    public.event_registrations%rowtype;

  event_row
    public.campus_events%rowtype;

  signature_value text;
  qr_token text;
  manual_code text;
  valid_from timestamptz;
  valid_until timestamptz;
  pass_state text;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  select *
  into registration_row
  from public.event_registrations
  where
    event_id = p_event_id
    and student_id = auth.uid()
  limit 1;

  if not found then
    raise exception
      'You are not registered for this event.';
  end if;

  select *
  into event_row
  from public.campus_events
  where id = p_event_id
  limit 1;

  if not found then
    raise exception
      'The event no longer exists.';
  end if;

  signature_value :=
    campusconnect_private.event_pass_signature(
      registration_row.id,
      registration_row.event_id,
      registration_row.student_id,
      registration_row.event_pass_version
    );

  qr_token :=
    'CCEV1.' ||
    registration_row.id::text ||
    '.' ||
    registration_row.event_pass_version::text ||
    '.' ||
    signature_value;

  manual_code :=
    upper(
      substr(signature_value, 1, 4) ||
      '-' ||
      substr(signature_value, 5, 4) ||
      '-' ||
      substr(signature_value, 9, 4)
    );

  valid_from :=
    event_row.event_date -
    interval '2 hours';

  valid_until :=
    coalesce(
      event_row.end_date,
      event_row.event_date +
        interval '6 hours'
    ) +
    interval '2 hours';

  pass_state :=
    case
      when registration_row.status =
        'Cancelled'
        then 'cancelled'

      when event_row.status =
        'Cancelled'
        then 'event_cancelled'

      when event_row.status <>
        'Published'
        then 'unavailable'

      when registration_row
        .event_pass_revoked_at
        is not null
        then 'revoked'

      when registration_row.checked_in
        then 'used'

      when now() > valid_until
        then 'expired'

      when now() < valid_from
        then 'upcoming'

      else 'valid'
    end;

  return jsonb_build_object(
    'success', true,
    'pass_uid',
      registration_row.event_pass_uid,
    'registration_id',
      registration_row.id,
    'event_id',
      event_row.id,
    'event_title',
      event_row.title,
    'event_date',
      event_row.event_date,
    'event_end_date',
      event_row.end_date,
    'venue',
      event_row.venue,
    'organizer',
      event_row.organizer,
    'student_name',
      registration_row.student_name,
    'department',
      registration_row.department,
    'graduation_year',
      registration_row.graduation_year,
    'qr_token',
      qr_token,
    'manual_code',
      manual_code,
    'pass_state',
      pass_state,
    'valid_from',
      valid_from,
    'valid_until',
      valid_until,
    'checked_in',
      registration_row.checked_in,
    'checked_in_at',
      registration_row.checked_in_at
  );
end;
$$;

revoke all
on function
  public.get_my_event_pass(uuid)
from public, anon;

grant execute
on function
  public.get_my_event_pass(uuid)
to authenticated;


-- ------------------------------------------------------------
-- AUTHORIZATION CHECK FOR EVENT SCANNERS
-- ------------------------------------------------------------

create or replace function
  public.can_scan_event_pass(
    p_event_id uuid
  )
returns boolean
language sql
stable
security definer
set search_path =
  pg_catalog,
  public
as $$
  select
    auth.uid() is not null
    and (
      coalesce(
        public.current_campus_role()::text,
        ''
      ) in (
        'Main Admin',
        'Coordinator'
      )

      or exists (
        select 1
        from public.campus_events event
        where
          event.id = p_event_id
          and event.created_by =
            auth.uid()
      )
    );
$$;

revoke all
on function
  public.can_scan_event_pass(uuid)
from public, anon;

grant execute
on function
  public.can_scan_event_pass(uuid)
to authenticated;


-- ------------------------------------------------------------
-- AUTHORIZED STAFF: ATOMIC CHECK-IN
-- Accepts either the complete QR token or the 12-character
-- manual code shown beneath the QR.
-- ------------------------------------------------------------

create or replace function
  public.check_in_event_pass(
    p_event_id uuid,
    p_pass_value text
  )
returns jsonb
language plpgsql
security definer
set search_path =
  pg_catalog,
  public,
  extensions,
  campusconnect_private
as $$
declare
  raw_value text;
  fingerprint text;
  scan_method text;

  registration_id_value uuid;
  token_version integer;
  supplied_signature text;
  expected_signature text;
  manual_compact text;

  registration_row
    public.event_registrations%rowtype;

  candidate_row
    public.event_registrations%rowtype;

  event_row
    public.campus_events%rowtype;

  matched_registration uuid;
  scanner_name text;
  valid_from timestamptz;
  valid_until timestamptz;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.can_scan_event_pass(
    p_event_id
  ) then
    raise exception
      'You are not authorized to scan passes for this event.';
  end if;

  raw_value :=
    trim(
      coalesce(
        p_pass_value,
        ''
      )
    );

  if raw_value = '' then
    return jsonb_build_object(
      'success', false,
      'code', 'EMPTY_PASS',
      'message',
        'Scan the QR or enter the manual pass code.'
    );
  end if;

  fingerprint :=
    substr(
      encode(
        digest(
          convert_to(
            raw_value,
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      ),
      1,
      24
    );

  select coalesce(
    nullif(profile.full_name, ''),
    nullif(profile.name, ''),
    'Campus staff'
  )
  into scanner_name
  from public.profiles profile
  where profile.id = auth.uid()
  limit 1;

  scanner_name :=
    coalesce(
      scanner_name,
      'Campus staff'
    );

  if raw_value ~*
    '^CCEV1\.[0-9a-f-]{36}\.[0-9]+\.[0-9a-f]{64}$'
  then
    scan_method := 'QR';

    registration_id_value :=
      split_part(
        raw_value,
        '.',
        2
      )::uuid;

    token_version :=
      split_part(
        raw_value,
        '.',
        3
      )::integer;

    supplied_signature :=
      lower(
        split_part(
          raw_value,
          '.',
          4
        )
      );

  else
    scan_method := 'Manual';

    manual_compact :=
      regexp_replace(
        upper(raw_value),
        '[^0-9A-F]',
        '',
        'g'
      );

    if length(manual_compact) <> 12 then
      perform
        campusconnect_private
        .record_event_pass_scan(
          p_event_id,
          null,
          scan_method,
          'INVALID_FORMAT',
          fingerprint,
          scanner_name
        );

      return jsonb_build_object(
        'success', false,
        'code', 'INVALID_FORMAT',
        'message',
          'Enter the 12-character event pass code.'
      );
    end if;

    for candidate_row in
      select *
      from public.event_registrations
      where
        event_id = p_event_id
        and status = 'Going'
    loop
      expected_signature :=
        campusconnect_private
        .event_pass_signature(
          candidate_row.id,
          candidate_row.event_id,
          candidate_row.student_id,
          candidate_row.event_pass_version
        );

      if upper(
        substr(
          expected_signature,
          1,
          12
        )
      ) = manual_compact then
        if matched_registration
          is not null
        then
          perform
            campusconnect_private
            .record_event_pass_scan(
              p_event_id,
              null,
              scan_method,
              'AMBIGUOUS_CODE',
              fingerprint,
              scanner_name
            );

          return jsonb_build_object(
            'success', false,
            'code', 'AMBIGUOUS_CODE',
            'message',
              'This code is ambiguous. Scan the QR instead.'
          );
        end if;

        matched_registration :=
          candidate_row.id;
      end if;
    end loop;

    if matched_registration is null then
      perform
        campusconnect_private
        .record_event_pass_scan(
          p_event_id,
          null,
          scan_method,
          'INVALID_CODE',
          fingerprint,
          scanner_name
        );

      return jsonb_build_object(
        'success', false,
        'code', 'INVALID_CODE',
        'message',
          'This event pass code is invalid.'
      );
    end if;

    registration_id_value :=
      matched_registration;
  end if;

  select *
  into registration_row
  from public.event_registrations
  where id = registration_id_value
  for update;

  if not found
    or registration_row.event_id <>
      p_event_id
  then
    perform
      campusconnect_private
      .record_event_pass_scan(
        p_event_id,
        null,
        scan_method,
        'WRONG_EVENT',
        fingerprint,
        scanner_name
      );

    return jsonb_build_object(
      'success', false,
      'code', 'WRONG_EVENT',
      'message',
        'This pass does not belong to the selected event.'
    );
  end if;

  if scan_method = 'QR' then
    expected_signature :=
      campusconnect_private
      .event_pass_signature(
        registration_row.id,
        registration_row.event_id,
        registration_row.student_id,
        registration_row.event_pass_version
      );

    if token_version <>
        registration_row.event_pass_version
      or supplied_signature <>
        expected_signature
    then
      perform
        campusconnect_private
        .record_event_pass_scan(
          p_event_id,
          registration_row.id,
          scan_method,
          'INVALID_SIGNATURE',
          fingerprint,
          scanner_name
        );

      return jsonb_build_object(
        'success', false,
        'code', 'INVALID_SIGNATURE',
        'message',
          'This QR pass is invalid or has been replaced.'
      );
    end if;
  end if;

  select *
  into event_row
  from public.campus_events
  where id = p_event_id
  limit 1;

  if registration_row.status <>
    'Going'
  then
    perform
      campusconnect_private
      .record_event_pass_scan(
        p_event_id,
        registration_row.id,
        scan_method,
        'CANCELLED',
        fingerprint,
        scanner_name
      );

    return jsonb_build_object(
      'success', false,
      'code', 'CANCELLED',
      'message',
        'This event registration was cancelled.'
    );
  end if;

  if registration_row
    .event_pass_revoked_at
    is not null
  then
    perform
      campusconnect_private
      .record_event_pass_scan(
        p_event_id,
        registration_row.id,
        scan_method,
        'REVOKED',
        fingerprint,
        scanner_name
      );

    return jsonb_build_object(
      'success', false,
      'code', 'REVOKED',
      'message',
        'This event pass has been revoked.'
    );
  end if;

  if event_row.status <>
    'Published'
  then
    perform
      campusconnect_private
      .record_event_pass_scan(
        p_event_id,
        registration_row.id,
        scan_method,
        'EVENT_UNAVAILABLE',
        fingerprint,
        scanner_name
      );

    return jsonb_build_object(
      'success', false,
      'code', 'EVENT_UNAVAILABLE',
      'message',
        'This event is not currently available for entry.'
    );
  end if;

  valid_from :=
    event_row.event_date -
    interval '2 hours';

  valid_until :=
    coalesce(
      event_row.end_date,
      event_row.event_date +
        interval '6 hours'
    ) +
    interval '2 hours';

  if now() < valid_from then
    perform
      campusconnect_private
      .record_event_pass_scan(
        p_event_id,
        registration_row.id,
        scan_method,
        'TOO_EARLY',
        fingerprint,
        scanner_name
      );

    return jsonb_build_object(
      'success', false,
      'code', 'TOO_EARLY',
      'message',
        'Event check-in has not opened yet.',
      'valid_from', valid_from
    );
  end if;

  if now() > valid_until then
    perform
      campusconnect_private
      .record_event_pass_scan(
        p_event_id,
        registration_row.id,
        scan_method,
        'EXPIRED',
        fingerprint,
        scanner_name
      );

    return jsonb_build_object(
      'success', false,
      'code', 'EXPIRED',
      'message',
        'This event pass has expired.'
    );
  end if;

  if registration_row.checked_in then
    perform
      campusconnect_private
      .record_event_pass_scan(
        p_event_id,
        registration_row.id,
        scan_method,
        'ALREADY_USED',
        fingerprint,
        scanner_name
      );

    return jsonb_build_object(
      'success', true,
      'already_checked_in', true,
      'code', 'ALREADY_USED',
      'message',
        'This attendee has already checked in.',
      'student_name',
        registration_row.student_name,
      'department',
        registration_row.department,
      'graduation_year',
        registration_row.graduation_year,
      'checked_in_at',
        registration_row.checked_in_at
    );
  end if;

  update public.event_registrations
  set
    checked_in = true,
    checked_in_at = now(),
    checked_in_by = auth.uid(),
    checked_in_by_name =
      scanner_name,
    check_in_method =
      scan_method,
    updated_at = now()
  where id = registration_row.id
  returning *
  into registration_row;

  perform
    campusconnect_private
    .record_event_pass_scan(
      p_event_id,
      registration_row.id,
      scan_method,
      'CHECKED_IN',
      fingerprint,
      scanner_name
    );

  return jsonb_build_object(
    'success', true,
    'already_checked_in', false,
    'code', 'CHECKED_IN',
    'message',
      'Attendee checked in successfully.',
    'student_name',
      registration_row.student_name,
    'department',
      registration_row.department,
    'graduation_year',
      registration_row.graduation_year,
    'checked_in_at',
      registration_row.checked_in_at,
    'check_in_method',
      registration_row.check_in_method
  );
end;
$$;

revoke all
on function
  public.check_in_event_pass(
    uuid,
    text
  )
from public, anon;

grant execute
on function
  public.check_in_event_pass(
    uuid,
    text
  )
to authenticated;

commit;

notify pgrst, 'reload schema';
