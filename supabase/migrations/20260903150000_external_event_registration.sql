-- ============================================================
-- CAMPUSCONNECT
-- EXTERNAL / INTER-COLLEGE EVENT REGISTRATION V1
-- ============================================================

begin;

create extension if not exists pgcrypto;


-- ============================================================
-- 1. EXTERNAL EVENT REGISTRATIONS
-- ============================================================

create table if not exists public.external_event_registrations (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references public.campus_events(id)
    on delete cascade,

  full_name text not null,
  email text not null,
  phone text not null,

  college_name text not null,
  department text not null default '',
  graduation_year text not null default '',

  fee_amount_paise integer not null default 0,

  payment_status text not null default 'Not Required',

  registration_status text not null default 'Confirmed',

  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  checked_in boolean not null default false,
  checked_in_at timestamptz,
  checked_in_by uuid,

  external_pass_uid uuid not null default gen_random_uuid(),
  external_pass_version integer not null default 1,
  external_pass_revoked_at timestamptz
);


-- ============================================================
-- 2. VALIDATION
-- ============================================================

alter table public.external_event_registrations
drop constraint if exists
  external_event_registration_fee_nonnegative;

alter table public.external_event_registrations
add constraint
  external_event_registration_fee_nonnegative
check (
  fee_amount_paise >= 0
);


alter table public.external_event_registrations
drop constraint if exists
  external_event_registration_payment_status_check;

alter table public.external_event_registrations
add constraint
  external_event_registration_payment_status_check
check (
  payment_status in (
    'Not Required',
    'Pending',
    'Paid',
    'Failed',
    'Refunded'
  )
);


alter table public.external_event_registrations
drop constraint if exists
  external_event_registration_status_check;

alter table public.external_event_registrations
add constraint
  external_event_registration_status_check
check (
  registration_status in (
    'Confirmed',
    'Pending',
    'Cancelled'
  )
);


-- ============================================================
-- 3. INDEXES
-- ============================================================

create index if not exists
  external_event_registrations_event_idx
on public.external_event_registrations(event_id);


create unique index if not exists
  external_event_registrations_event_email_idx
on public.external_event_registrations(
  event_id,
  lower(email)
)
where registration_status <> 'Cancelled';


create unique index if not exists
  external_event_registrations_pass_uid_idx
on public.external_event_registrations(
  external_pass_uid
);


-- ============================================================
-- 4. RLS
--
-- No anonymous SELECT/INSERT/UPDATE/DELETE.
-- Public interaction happens only through narrow RPC functions.
-- ============================================================

alter table public.external_event_registrations
enable row level security;

revoke all
on public.external_event_registrations
from anon, authenticated;


-- ============================================================
-- 5. SAFE PUBLIC EVENT LOOKUP
--
-- Exposes only fields required by the public registration page.
-- Does NOT expose creator IDs or attendee data.
-- ============================================================

create or replace function
public.get_public_event_registration(
  p_slug text
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

  event_row public.campus_events%rowtype;

  internal_count bigint := 0;
  external_count bigint := 0;
  confirmed_count bigint := 0;

  closed_reason text := '';

begin

  if
    p_slug is null
    or btrim(p_slug) = ''
  then
    return jsonb_build_object(
      'success', false,
      'error', 'Registration link is invalid.'
    );
  end if;


  select event_record.*
  into event_row
  from public.campus_events as event_record
  where
    event_record.public_registration_slug = btrim(p_slug)
    and event_record.status = 'Published'
    and coalesce(
      event_record.external_registration_enabled,
      false
    ) = true
  limit 1;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error',
      'This registration link is unavailable.'
    );
  end if;


  select count(*)
  into internal_count
  from public.event_registrations as registration
  where
    registration.event_id = event_row.id
    and registration.status = 'Going';


  select count(*)
  into external_count
  from public.external_event_registrations as registration
  where
    registration.event_id = event_row.id
    and registration.registration_status = 'Confirmed';


  confirmed_count :=
    internal_count + external_count;


  if event_row.event_date <= now() then

    closed_reason :=
      'This event has already started.';

  elsif
    event_row.registration_deadline is not null
    and event_row.registration_deadline <= now()
  then

    closed_reason :=
      'The registration deadline has passed.';

  elsif
    event_row.capacity is not null
    and event_row.capacity > 0
    and confirmed_count >= event_row.capacity
  then

    closed_reason :=
      'This event is full.';

  end if;


  return jsonb_build_object(

    'success', true,

    'event',
    jsonb_build_object(

      'slug',
      event_row.public_registration_slug,

      'title',
      event_row.title,

      'short_description',
      event_row.short_description,

      'description',
      event_row.description,

      'category',
      event_row.category,

      'venue',
      event_row.venue,

      'organizer',
      event_row.organizer,

      'event_date',
      event_row.event_date,

      'end_date',
      event_row.end_date,

      'banner_url',
      event_row.banner_url,

      'audience_department',
      event_row.audience_department,

      'audience_year',
      event_row.audience_year,

      'registration_deadline',
      event_row.registration_deadline,

      'capacity',
      event_row.capacity,

      'external_fee_paise',
      greatest(
        coalesce(
          event_row.external_fee_paise,
          0
        ),
        0
      ),

      'registration_open',
      closed_reason = '',

      'closed_reason',
      closed_reason,

      'confirmed_count',
      confirmed_count,

      'seats_remaining',
      case
        when
          event_row.capacity is not null
          and event_row.capacity > 0
        then
          greatest(
            event_row.capacity - confirmed_count,
            0
          )
        else null
      end

    )

  );

end;
$$;


revoke all
on function
public.get_public_event_registration(text)
from public;

grant execute
on function
public.get_public_event_registration(text)
to anon, authenticated;


-- ============================================================
-- 6. PUBLIC EXTERNAL REGISTRATION
--
-- IMPORTANT:
-- Free registrations can be confirmed now.
-- Paid registrations are NOT confirmed without a real
-- payment gateway.
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

  event_row public.campus_events%rowtype;

  registration_row
    public.external_event_registrations%rowtype;

  internal_count bigint := 0;
  external_count bigint := 0;
  confirmed_count bigint := 0;

  normalized_email text;
  normalized_phone text;

  calculated_fee integer := 0;

begin

  -- ----------------------------------------------------------
  -- Basic input validation
  -- ----------------------------------------------------------

  if
    p_slug is null
    or btrim(p_slug) = ''
  then
    raise exception
      'Invalid registration link.';
  end if;


  if
    p_full_name is null
    or char_length(btrim(p_full_name)) < 2
    or char_length(btrim(p_full_name)) > 120
  then
    raise exception
      'Enter a valid full name.';
  end if;


  normalized_email :=
    lower(btrim(coalesce(p_email, '')));


  if
    normalized_email = ''
    or normalized_email !~
      '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    or char_length(normalized_email) > 254
  then
    raise exception
      'Enter a valid email address.';
  end if;


  normalized_phone :=
    regexp_replace(
      coalesce(p_phone, ''),
      '[^0-9+]',
      '',
      'g'
    );


  if
    char_length(normalized_phone) < 10
    or char_length(normalized_phone) > 16
  then
    raise exception
      'Enter a valid phone number.';
  end if;


  if
    p_college_name is null
    or char_length(btrim(p_college_name)) < 2
    or char_length(btrim(p_college_name)) > 180
  then
    raise exception
      'Enter your college name.';
  end if;


  -- ----------------------------------------------------------
  -- Event
  -- ----------------------------------------------------------

  select event_record.*
  into event_row
  from public.campus_events as event_record
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


  -- ----------------------------------------------------------
  -- Timing
  -- ----------------------------------------------------------

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
  -- Duplicate registration
  -- ----------------------------------------------------------

  if exists (
    select 1
    from public.external_event_registrations
      as existing_registration
    where
      existing_registration.event_id =
        event_row.id

      and lower(
        existing_registration.email
      ) = normalized_email

      and existing_registration.registration_status
        <> 'Cancelled'
  )
  then
    raise exception
      'This email is already registered for the event.';
  end if;


  -- ----------------------------------------------------------
  -- Shared event capacity:
  -- RNSIT confirmed + external confirmed
  -- ----------------------------------------------------------

  if
    event_row.capacity is not null
    and event_row.capacity > 0
  then

    select count(*)
    into internal_count
    from public.event_registrations
      as registration
    where
      registration.event_id =
        event_row.id

      and registration.status =
        'Going';


    select count(*)
    into external_count
    from public.external_event_registrations
      as registration
    where
      registration.event_id =
        event_row.id

      and registration.registration_status =
        'Confirmed';


    confirmed_count :=
      internal_count + external_count;


    if confirmed_count >= event_row.capacity then
      raise exception
        'This event is full.';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- Server-side external price
  -- ----------------------------------------------------------

  calculated_fee :=
    greatest(
      coalesce(
        event_row.external_fee_paise,
        0
      ),
      0
    );


  -- ----------------------------------------------------------
  -- We intentionally block paid external registration until
  -- payment verification exists.
  --
  -- This prevents a user receiving a valid registration/pass
  -- without paying.
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

  insert into public.external_event_registrations (

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

    btrim(p_full_name),
    normalized_email,
    normalized_phone,

    btrim(p_college_name),
    btrim(coalesce(p_department, '')),
    btrim(coalesce(p_graduation_year, '')),

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
    registration_row.registered_at

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


commit;
