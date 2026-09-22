-- ============================================================
-- CAMPUSCONNECT
-- EXTERNAL EVENT SECURE PASS V1
--
-- Public attendee receives an opaque claim token after a
-- confirmed FREE registration.
--
-- The token can retrieve ONLY that attendee's pass.
-- Registration UUID is never used as the public credential.
-- ============================================================

begin;

create extension if not exists pgcrypto;


-- ============================================================
-- 1. PRIVATE CLAIM TOKEN
-- ============================================================

alter table public.external_event_registrations
add column if not exists
  pass_claim_token text;


create unique index if not exists
  external_event_registrations_claim_token_idx
on public.external_event_registrations(
  pass_claim_token
)
where pass_claim_token is not null;


-- ============================================================
-- 2. GENERATE CLAIM TOKEN
-- ============================================================

create or replace function
public.ensure_external_event_claim_token()
returns trigger
language plpgsql
security invoker
set search_path =
  pg_catalog,
  public,
  extensions
as $$
begin

  if
    new.registration_status = 'Confirmed'
    and (
      new.pass_claim_token is null
      or btrim(new.pass_claim_token) = ''
    )
  then

    new.pass_claim_token :=
      'CCXP_' ||
      replace(
        gen_random_uuid()::text,
        '-',
        ''
      ) ||
      replace(
        gen_random_uuid()::text,
        '-',
        ''
      );

  end if;

  return new;

end;
$$;


drop trigger if exists
  ensure_external_event_claim_token_trigger
on public.external_event_registrations;


create trigger
  ensure_external_event_claim_token_trigger
before insert or update of registration_status
on public.external_event_registrations
for each row
execute function
  public.ensure_external_event_claim_token();


-- Backfill existing confirmed external registrations.

update public.external_event_registrations
set
  pass_claim_token =
    'CCXP_' ||
    (
        replace(
          gen_random_uuid()::text,
          '-',
          ''
        ) ||
        replace(
          gen_random_uuid()::text,
          '-',
          ''
        )
      )
where
  registration_status = 'Confirmed'
  and (
    pass_claim_token is null
    or btrim(pass_claim_token) = ''
  );


-- ============================================================
-- 3. UPDATE PUBLIC REGISTRATION RPC
--
-- Same validation/security as V1.
-- Difference:
-- confirmed FREE registration now returns a private pass URL
-- claim token.
-- ============================================================

create or replace function
public.register_external_event_attendee(
  p_slug text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_college_name text,
  p_department text default '',
  p_graduation_year text default ''
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

  event_row
    public.campus_events%rowtype;

  registration_row
    public.external_event_registrations%rowtype;

  internal_count bigint := 0;
  external_count bigint := 0;
  confirmed_count bigint := 0;

  normalized_email text;
  normalized_phone text;

  calculated_fee integer := 0;

begin

  if
    p_slug is null
    or btrim(p_slug) = ''
  then
    raise exception
      'Invalid registration link.';
  end if;


  if
    p_full_name is null
    or char_length(
      btrim(p_full_name)
    ) < 2
    or char_length(
      btrim(p_full_name)
    ) > 120
  then
    raise exception
      'Enter a valid full name.';
  end if;


  normalized_email :=
    lower(
      btrim(
        coalesce(
          p_email,
          ''
        )
      )
    );


  if
    normalized_email = ''
    or normalized_email !~
      '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    or char_length(
      normalized_email
    ) > 254
  then
    raise exception
      'Enter a valid email address.';
  end if;


  normalized_phone :=
    regexp_replace(
      coalesce(
        p_phone,
        ''
      ),
      '[^0-9+]',
      '',
      'g'
    );


  if
    char_length(
      normalized_phone
    ) < 10
    or char_length(
      normalized_phone
    ) > 16
  then
    raise exception
      'Enter a valid phone number.';
  end if;


  if
    p_college_name is null
    or char_length(
      btrim(p_college_name)
    ) < 2
    or char_length(
      btrim(p_college_name)
    ) > 180
  then
    raise exception
      'Enter your college name.';
  end if;


  -- ----------------------------------------------------------
  -- EVENT
  -- ----------------------------------------------------------

  select
    event_record.*

  into
    event_row

  from
    public.campus_events
      as event_record

  where
    event_record.public_registration_slug =
      btrim(p_slug)

    and event_record.status =
      'Published'

    and coalesce(
      event_record.external_registration_enabled,
      false
    ) = true

  limit 1;


  if not found then
    raise exception
      'This registration link is unavailable.';
  end if;


  if event_row.event_date <= now() then
    raise exception
      'Registration is closed because the event has started.';
  end if;


  if
    event_row.registration_deadline is not null
    and event_row.registration_deadline <= now()
  then
    raise exception
      'The registration deadline has passed.';
  end if;


  -- ----------------------------------------------------------
  -- DUPLICATE
  -- ----------------------------------------------------------

  if exists (
    select 1

    from
      public.external_event_registrations
        as existing_registration

    where
      existing_registration.event_id =
        event_row.id

      and lower(
        existing_registration.email
      ) =
        normalized_email

      and existing_registration.registration_status
        <> 'Cancelled'
  )
  then
    raise exception
      'This email is already registered for the event.';
  end if;


  -- ----------------------------------------------------------
  -- SHARED CAPACITY
  -- ----------------------------------------------------------

  if
    event_row.capacity is not null
    and event_row.capacity > 0
  then

    select count(*)

    into internal_count

    from
      public.event_registrations
        as registration

    where
      registration.event_id =
        event_row.id

      and registration.status =
        'Going';


    select count(*)

    into external_count

    from
      public.external_event_registrations
        as registration

    where
      registration.event_id =
        event_row.id

      and registration.registration_status =
        'Confirmed';


    confirmed_count :=
      internal_count +
      external_count;


    if
      confirmed_count >=
      event_row.capacity
    then
      raise exception
        'This event is full.';
    end if;

  end if;


  calculated_fee :=
    greatest(
      coalesce(
        event_row.external_fee_paise,
        0
      ),
      0
    );


  -- ----------------------------------------------------------
  -- PAID EXTERNAL EVENT
  --
  -- Payment provider is not connected yet.
  -- Do not create fake confirmed registration.
  -- ----------------------------------------------------------

  if calculated_fee > 0 then

    return jsonb_build_object(

      'success',
      false,

      'payment_required',
      true,

      'fee_amount_paise',
      calculated_fee,

      'message',
      'Online payment for this event is not available yet.'

    );

  end if;


  -- ----------------------------------------------------------
  -- FREE EXTERNAL REGISTRATION
  -- ----------------------------------------------------------

  insert into
    public.external_event_registrations (

      event_id,

      full_name,
      email,
      phone,

      college_name,
      department,
      graduation_year,

      fee_amount_paise,
      payment_status,
      registration_status,

      updated_at

    )

  values (

    event_row.id,

    btrim(
      p_full_name
    ),

    normalized_email,

    normalized_phone,

    btrim(
      p_college_name
    ),

    btrim(
      coalesce(
        p_department,
        ''
      )
    ),

    btrim(
      coalesce(
        p_graduation_year,
        ''
      )
    ),

    0,

    'Not Required',

    'Confirmed',

    now()

  )

  returning *
  into registration_row;


  return jsonb_build_object(

    'success',
    true,

    'registration_id',
    registration_row.id,

    'event_title',
    event_row.title,

    'registration_status',
    registration_row.registration_status,

    'payment_status',
    registration_row.payment_status,

    'fee_amount_paise',
    0,

    'registered_at',
    registration_row.registered_at,

    'pass_claim_token',
    registration_row.pass_claim_token

  );

end;
$$;


revoke all
on function
public.register_external_event_attendee(
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
from public;


grant execute
on function
public.register_external_event_attendee(
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
to anon, authenticated;



-- ============================================================
-- 4. GET EXTERNAL PASS
--
-- Claim token acts like a private capability URL.
-- It must NEVER appear in organizer roster RPCs or CSV.
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

  manual_code text;

  qr_token text;

  pass_state text;

begin

  if
    p_claim_token is null
    or char_length(
      btrim(p_claim_token)
    ) < 30
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
      btrim(p_claim_token)

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
    campus_event.*

  into
    event_row

  from
    public.campus_events
      as campus_event

  where
    campus_event.id =
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


  if
    registration_row.registration_status
      <> 'Confirmed'
  then

    pass_state :=
      'Inactive';

  elsif
    registration_row.external_pass_revoked_at
      is not null
  then

    pass_state :=
      'Revoked';

  elsif
    registration_row.checked_in = true
  then

    pass_state :=
      'Checked In';

  else

    pass_state :=
      'Valid';

  end if;


  -- ----------------------------------------------------------
  -- QR token
  --
  -- QR contains an opaque random public pass UID.
  -- It does NOT contain email/phone/registration UUID.
  -- ----------------------------------------------------------

  qr_token :=
    'CCEXT1.' ||
    registration_row.external_pass_uid::text ||
    '.' ||
    registration_row.external_pass_version::text;


  -- ----------------------------------------------------------
  -- Human-readable manual code.
  --
  -- Derived server-side from pass UID + version.
  -- ----------------------------------------------------------

  manual_code :=
    upper(
      substr(
        encode(
          digest(
            registration_row.external_pass_uid::text ||
            ':' ||
            registration_row.external_pass_version::text,
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
      manual_code,
      1,
      4
    ) ||
    '-' ||
    substr(
      manual_code,
      5,
      4
    ) ||
    '-' ||
    substr(
      manual_code,
      9,
      4
    );


  return jsonb_build_object(

    'success',
    true,

    'pass_uid',
    registration_row.external_pass_uid,

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
    qr_token,

    'manual_code',
    manual_code,

    'pass_state',
    pass_state,

    'checked_in',
    registration_row.checked_in,

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


commit;

notify pgrst, 'reload schema';
