-- ============================================================
-- CAMPUSCONNECT
-- EXTERNAL PASS + BARCODE GATE V1
--
-- RNSIT verifier remains untouched.
--
-- External credentials:
--   QR      -> CCEXQ1.<opaque claim token>
--   BARCODE -> CCEXB1.<opaque claim token>
--   MANUAL  -> XXXX-XXXX-XXXX
--
-- Unified entry:
--   check_in_any_event_pass(event, value)
-- ============================================================

begin;


-- ============================================================
-- EXTRA OPERATIONAL METADATA
-- ============================================================

alter table public.external_event_registrations
add column if not exists
  checked_in_by_name text;

alter table public.external_event_registrations
add column if not exists
  check_in_method text;


-- ============================================================
-- EXTERNAL PASS
-- ============================================================

create or replace function
public.get_external_event_pass(
  p_claim_token text
)
returns jsonb
language plpgsql
stable
security definer
set search_path =
  pg_catalog,
  public,
  extensions
as $$
declare

  registration_row
    public.external_event_registrations%rowtype;

  event_row
    public.campus_events%rowtype;

  manual_compact text;

  manual_code text;

  pass_state text;

  valid_from timestamptz;

  valid_until timestamptz;

begin

  if
    p_claim_token is null
    or p_claim_token !~
      '^CCXP_[0-9a-fA-F]{64}$'
  then

    return jsonb_build_object(
      'success',
      false,

      'error',
      'Invalid event pass.'
    );

  end if;


  select
    registration.*

  into
    registration_row

  from
    public.external_event_registrations
      as registration

  where
    registration.pass_claim_token =
      p_claim_token

  limit 1;


  if not found then

    return jsonb_build_object(
      'success',
      false,

      'error',
      'Event pass was not found.'
    );

  end if;


  select
    event.*

  into
    event_row

  from
    public.campus_events
      as event

  where
    event.id =
      registration_row.event_id

  limit 1;


  if not found then

    return jsonb_build_object(
      'success',
      false,

      'error',
      'Event was not found.'
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


  manual_compact :=
    upper(
      substr(
        encode(
          digest(
            convert_to(
              registration_row.pass_claim_token,
              'UTF8'
            ),
            'sha256'
          ),
          'hex'
        ),
        1,
        12
      )
    );


  manual_code :=
    substr(
      manual_compact,
      1,
      4
    )
    || '-' ||
    substr(
      manual_compact,
      5,
      4
    )
    || '-' ||
    substr(
      manual_compact,
      9,
      4
    );


  pass_state :=

    case

      when
        event_row.status =
          'Cancelled'
      then
        'event_cancelled'

      when
        registration_row.registration_status
          <> 'Confirmed'
      then
        'cancelled'

      when
        registration_row.external_pass_revoked_at
          is not null
      then
        'revoked'

      when
        registration_row.checked_in
          is true
      then
        'used'

      when
        now() < valid_from
      then
        'upcoming'

      when
        now() > valid_until
      then
        'expired'

      else
        'valid'

    end;


  return jsonb_build_object(

    'success',
    true,

    'pass_uid',
    registration_row.external_pass_uid,

    'event_id',
    registration_row.event_id,

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

    'category',
    event_row.category,

    'attendee_name',
    registration_row.full_name,

    'college_name',
    registration_row.college_name,

    'department',
    registration_row.department,

    'graduation_year',
    registration_row.graduation_year,

    'qr_token',
    'CCEXQ1.' ||
      registration_row.pass_claim_token,

    'barcode_token',
    'CCEXB1.' ||
      registration_row.pass_claim_token,

    'manual_code',
    manual_code,

    'pass_state',
    pass_state,

    'valid_from',
    valid_from,

    'valid_until',
    valid_until,

    'checked_in',
    coalesce(
      registration_row.checked_in,
      false
    ),

    'checked_in_at',
    registration_row.checked_in_at

  );

end;
$$;


revoke all
on function
public.get_external_event_pass(text)
from public;


grant execute
on function
public.get_external_event_pass(text)
to anon, authenticated;



-- ============================================================
-- EXTERNAL PASS CHECK-IN
-- ============================================================

create or replace function
public.check_in_external_event_pass(
  p_event_id uuid,
  p_pass_value text
)
returns jsonb
language plpgsql
security definer
set search_path =
  pg_catalog,
  public,
  extensions
as $$
declare

  raw_value text;

  claim_token text;

  manual_compact text;

  expected_manual text;

  scan_method text;

  matched_id uuid;

  match_count integer := 0;

  registration_row
    public.external_event_registrations%rowtype;

  event_row
    public.campus_events%rowtype;

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
      'success',
      false,

      'code',
      'EMPTY_PASS',

      'message',
      'Scan the QR/barcode or enter the pass code.'
    );

  end if;


  select
    coalesce(
      nullif(
        profile.full_name,
        ''
      ),
      'Campus staff'
    )

  into
    scanner_name

  from
    public.profiles
      as profile

  where
    profile.id =
      auth.uid()

  limit 1;


  scanner_name :=
    coalesce(
      scanner_name,
      'Campus staff'
    );


  -- ----------------------------------------------------------
  -- QR TOKEN
  -- ----------------------------------------------------------

  if raw_value ~*
    '^CCEXQ1\.CCXP_[0-9a-f]{64}$'
  then

    scan_method :=
      'QR';

    claim_token :=
      split_part(
        raw_value,
        '.',
        2
      );


  -- ----------------------------------------------------------
  -- BARCODE TOKEN
  -- ----------------------------------------------------------

  elsif raw_value ~*
    '^CCEXB1\.CCXP_[0-9a-f]{64}$'
  then

    scan_method :=
      'Barcode';

    claim_token :=
      split_part(
        raw_value,
        '.',
        2
      );


  -- ----------------------------------------------------------
  -- RAW CLAIM TOKEN
  -- ----------------------------------------------------------

  elsif raw_value ~*
    '^CCXP_[0-9a-f]{64}$'
  then

    scan_method :=
      'Barcode';

    claim_token :=
      raw_value;


  -- ----------------------------------------------------------
  -- MANUAL CODE
  -- ----------------------------------------------------------

  else

    scan_method :=
      'Manual';


    manual_compact :=
      regexp_replace(
        upper(raw_value),
        '[^0-9A-F]',
        '',
        'g'
      );


    if length(
      manual_compact
    ) <> 12 then

      return jsonb_build_object(
        'success',
        false,

        'code',
        'INVALID_FORMAT',

        'message',
        'Enter the 12-character event pass code.'
      );

    end if;


    for registration_row in

      select
        registration.*

      from
        public.external_event_registrations
          as registration

      where
        registration.event_id =
          p_event_id

        and registration.registration_status =
          'Confirmed'

    loop

      expected_manual :=
        upper(
          substr(
            encode(
              digest(
                convert_to(
                  registration_row.pass_claim_token,
                  'UTF8'
                ),
                'sha256'
              ),
              'hex'
            ),
            1,
            12
          )
        );


      if
        expected_manual =
        manual_compact
      then

        matched_id :=
          registration_row.id;

        match_count :=
          match_count + 1;

      end if;

    end loop;


    if match_count = 0 then

      return jsonb_build_object(
        'success',
        false,

        'code',
        'INVALID_CODE',

        'message',
        'This external event pass code is invalid.'
      );

    end if;


    if match_count > 1 then

      return jsonb_build_object(
        'success',
        false,

        'code',
        'AMBIGUOUS_CODE',

        'message',
        'This code is ambiguous. Scan the QR or barcode instead.'
      );

    end if;


    select
      registration.pass_claim_token

    into
      claim_token

    from
      public.external_event_registrations
        as registration

    where
      registration.id =
        matched_id;

  end if;


  -- ----------------------------------------------------------
  -- LOCK REGISTRATION
  -- ----------------------------------------------------------

  select
    registration.*

  into
    registration_row

  from
    public.external_event_registrations
      as registration

  where
    registration.pass_claim_token =
      claim_token

  for update;


  if not found then

    return jsonb_build_object(
      'success',
      false,

      'code',
      'INVALID_PASS',

      'message',
      'This event pass is invalid.'
    );

  end if;


  if
    registration_row.event_id <>
      p_event_id
  then

    return jsonb_build_object(
      'success',
      false,

      'code',
      'WRONG_EVENT',

      'message',
      'This pass does not belong to the selected event.'
    );

  end if;


  select
    event.*

  into
    event_row

  from
    public.campus_events
      as event

  where
    event.id =
      p_event_id

  limit 1;


  if not found then

    return jsonb_build_object(
      'success',
      false,

      'code',
      'EVENT_NOT_FOUND',

      'message',
      'Event was not found.'
    );

  end if;


  if event_row.status =
    'Cancelled'
  then

    return jsonb_build_object(
      'success',
      false,

      'code',
      'EVENT_CANCELLED',

      'message',
      'This event has been cancelled.'
    );

  end if;


  if registration_row.registration_status
    <> 'Confirmed'
  then

    return jsonb_build_object(
      'success',
      false,

      'code',
      'CANCELLED',

      'message',
      'This event registration is not active.'
    );

  end if;


  if registration_row.external_pass_revoked_at
    is not null
  then

    return jsonb_build_object(
      'success',
      false,

      'code',
      'REVOKED',

      'message',
      'This event pass has been revoked.'
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

    return jsonb_build_object(
      'success',
      false,

      'code',
      'TOO_EARLY',

      'message',
      'Check-in is not open yet.'
    );

  end if;


  if now() > valid_until then

    return jsonb_build_object(
      'success',
      false,

      'code',
      'EXPIRED',

      'message',
      'This event pass has expired.'
    );

  end if;


  if registration_row.checked_in
    is true
  then

    return jsonb_build_object(

      'success',
      true,

      'already_checked_in',
      true,

      'code',
      'ALREADY_CHECKED_IN',

      'message',
      'This attendee is already checked in.',

      'attendee_type',
      'External',

      'student_name',
      registration_row.full_name,

      'college_name',
      registration_row.college_name,

      'department',
      registration_row.department,

      'graduation_year',
      registration_row.graduation_year,

      'checked_in_at',
      registration_row.checked_in_at,

      'check_in_method',
      registration_row.check_in_method

    );

  end if;


  update
    public.external_event_registrations

  set
    checked_in =
      true,

    checked_in_at =
      now(),

    checked_in_by =
      auth.uid(),

    checked_in_by_name =
      scanner_name,

    check_in_method =
      scan_method,

    updated_at =
      now()

  where
    id =
      registration_row.id

  returning *
  into
    registration_row;


  return jsonb_build_object(

    'success',
    true,

    'already_checked_in',
    false,

    'code',
    'CHECKED_IN',

    'message',
    'External attendee checked in successfully.',

    'attendee_type',
    'External',

    'student_name',
    registration_row.full_name,

    'college_name',
    registration_row.college_name,

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
public.check_in_external_event_pass(
  uuid,
  text
)
from public, anon;


grant execute
on function
public.check_in_external_event_pass(
  uuid,
  text
)
to authenticated;



-- ============================================================
-- UNIFIED RNSIT + EXTERNAL ENTRY GATE
--
-- Existing check_in_event_pass() remains untouched.
-- ============================================================

create or replace function
public.check_in_any_event_pass(
  p_event_id uuid,
  p_pass_value text
)
returns jsonb
language plpgsql
security definer
set search_path =
  pg_catalog,
  public,
  extensions
as $$
declare

  raw_value text;

  compact_value text;

  external_matches integer := 0;

begin

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;


  raw_value :=
    trim(
      coalesce(
        p_pass_value,
        ''
      )
    );


  -- External QR / Barcode / raw opaque credential.

  if
    raw_value ~*
      '^CCEXQ1\.CCXP_[0-9a-f]{64}$'

    or raw_value ~*
      '^CCEXB1\.CCXP_[0-9a-f]{64}$'

    or raw_value ~*
      '^CCXP_[0-9a-f]{64}$'
  then

    return
      public.check_in_external_event_pass(
        p_event_id,
        raw_value
      );

  end if;


  -- Manual code can belong to either RNSIT or External.
  -- Check whether it matches an external pass first.

  compact_value :=
    regexp_replace(
      upper(raw_value),
      '[^0-9A-F]',
      '',
      'g'
    );


  if length(
    compact_value
  ) = 12 then

    select count(*)

    into
      external_matches

    from
      public.external_event_registrations
        as registration

    where
      registration.event_id =
        p_event_id

      and registration.registration_status =
        'Confirmed'

      and upper(
        substr(
          encode(
            digest(
              convert_to(
                registration.pass_claim_token,
                'UTF8'
              ),
              'sha256'
            ),
            'hex'
          ),
          1,
          12
        )
      ) =
        compact_value;


    if external_matches > 0 then

      return
        public.check_in_external_event_pass(
          p_event_id,
          raw_value
        );

    end if;

  end if;


  -- Otherwise preserve the existing secure RNSIT verifier.

  return
    public.check_in_event_pass(
      p_event_id,
      raw_value
    );

end;
$$;


revoke all
on function
public.check_in_any_event_pass(
  uuid,
  text
)
from public, anon;


grant execute
on function
public.check_in_any_event_pass(
  uuid,
  text
)
to authenticated;


commit;

notify pgrst, 'reload schema';
