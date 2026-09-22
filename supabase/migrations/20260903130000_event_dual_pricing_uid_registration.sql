-- ============================================================
-- CAMPUSCONNECT EVENT REGISTRATION V2
-- RNSIT UID verified pricing + external/inter-college pricing
-- ============================================================

begin;

create extension if not exists pgcrypto;


-- ============================================================
-- 1. EVENT PRICING / ACCESS CONFIGURATION
-- ============================================================

alter table public.campus_events
add column if not exists
  rnsit_registration_enabled boolean
  not null
  default true;

alter table public.campus_events
add column if not exists
  rnsit_fee_paise integer
  not null
  default 0;

alter table public.campus_events
add column if not exists
  external_registration_enabled boolean
  not null
  default false;

alter table public.campus_events
add column if not exists
  external_fee_paise integer
  not null
  default 0;

alter table public.campus_events
add column if not exists
  public_registration_slug text;


-- ============================================================
-- 2. VALIDATE FEES
-- ============================================================

alter table public.campus_events
drop constraint if exists
  campus_events_rnsit_fee_nonnegative;

alter table public.campus_events
add constraint
  campus_events_rnsit_fee_nonnegative
check (
  rnsit_fee_paise >= 0
);


alter table public.campus_events
drop constraint if exists
  campus_events_external_fee_nonnegative;

alter table public.campus_events
add constraint
  campus_events_external_fee_nonnegative
check (
  external_fee_paise >= 0
);


-- ============================================================
-- 3. UNIQUE PUBLIC EVENT LINK
-- ============================================================

create unique index if not exists
  campus_events_public_registration_slug_idx
on public.campus_events(
  public_registration_slug
)
where public_registration_slug is not null;


-- ============================================================
-- 4. GENERATE STABLE PUBLIC SLUG
--
-- Do not expose sequential IDs.
-- Slug remains stable after creation.
-- ============================================================

create or replace function
public.ensure_event_public_registration_slug()
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
    new.external_registration_enabled = true
    and (
      new.public_registration_slug is null
      or btrim(new.public_registration_slug) = ''
    )
  then

    new.public_registration_slug :=
      'event-' ||
      lower(
        substr(
          encode(
            digest(
              gen_random_uuid()::text ||
              clock_timestamp()::text,
              'sha256'
            ),
            'hex'
          ),
          1,
          16
        )
      );

  end if;

  return new;

end;
$$;


drop trigger if exists
  ensure_event_public_registration_slug_trigger
on public.campus_events;


create trigger
  ensure_event_public_registration_slug_trigger
before insert or update of
  external_registration_enabled,
  public_registration_slug
on public.campus_events
for each row
execute function
  public.ensure_event_public_registration_slug();


-- ============================================================
-- 5. REGISTRATION PAYMENT / IDENTITY FIELDS
-- ============================================================

alter table public.event_registrations
add column if not exists
  registration_source text
  not null
  default 'RNSIT';

alter table public.event_registrations
add column if not exists
  verified_campus_uid text;

alter table public.event_registrations
add column if not exists
  fee_amount_paise integer
  not null
  default 0;

alter table public.event_registrations
add column if not exists
  payment_status text
  not null
  default 'Not Required';


alter table public.event_registrations
drop constraint if exists
  event_registration_source_check;

alter table public.event_registrations
add constraint
  event_registration_source_check
check (
  registration_source in (
    'RNSIT',
    'External'
  )
);


alter table public.event_registrations
drop constraint if exists
  event_registration_payment_status_check;

alter table public.event_registrations
add constraint
  event_registration_payment_status_check
check (
  payment_status in (
    'Not Required',
    'Pending',
    'Paid',
    'Failed',
    'Refunded'
  )
);


alter table public.event_registrations
drop constraint if exists
  event_registration_fee_nonnegative;

alter table public.event_registrations
add constraint
  event_registration_fee_nonnegative
check (
  fee_amount_paise >= 0
);


-- ============================================================
-- 6. VERIFIED RNSIT REGISTRATION RPC
--
-- SECURITY:
-- Browser cannot choose its fee.
-- Browser cannot submit another Campus UID.
--
-- auth.uid()
--      ↓
-- profiles.id
--      ↓
-- profiles.campus_uid
--      ↓
-- event.rnsit_fee_paise
-- ============================================================

create or replace function
public.register_for_campus_event(
  p_event_id uuid
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

  profile_row
    public.profiles%rowtype;

  registration_row
    public.event_registrations%rowtype;

  registration_count bigint;

  calculated_fee integer;

begin

  -- ----------------------------------------------------------
  -- Authentication
  -- ----------------------------------------------------------

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;


  -- ----------------------------------------------------------
  -- Event
  -- ----------------------------------------------------------

  select event_record.*
  into event_row
  from public.campus_events as event_record
  where event_record.id = p_event_id
  limit 1;

  if not found then
    raise exception
      'Event not found.';
  end if;


  if event_row.status <> 'Published' then
    raise exception
      'This event is not open for registration.';
  end if;


  if
    coalesce(
      event_row.allow_campus_registration,
      true
    ) = false
    or
    coalesce(
      event_row.rnsit_registration_enabled,
      true
    ) = false
  then
    raise exception
      'RNSIT registration is disabled for this event.';
  end if;


  -- ----------------------------------------------------------
  -- Event timing
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
  -- VERIFIED PROFILE
  -- ----------------------------------------------------------

  select profile_record.*
  into profile_row
  from public.profiles as profile_record
  where profile_record.id = auth.uid()
  limit 1;

  if not found then
    raise exception
      'CampusConnect profile not found.';
  end if;


  if
    profile_row.campus_uid is null
    or btrim(profile_row.campus_uid) = ''
  then
    raise exception
      'A verified CampusConnect UID is required for RNSIT registration.';
  end if;


  -- ----------------------------------------------------------
  -- Capacity
  -- ----------------------------------------------------------

  if
    event_row.capacity is not null
    and event_row.capacity > 0
  then

    select count(*)
    into registration_count
    from public.event_registrations as registration
    where
      registration.event_id = p_event_id
      and registration.status = 'Going';

    if registration_count >= event_row.capacity then
      raise exception
        'This event is full.';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- PRICE COMES FROM DATABASE
  -- ----------------------------------------------------------

  calculated_fee :=
    greatest(
      coalesce(
        event_row.rnsit_fee_paise,
        0
      ),
      0
    );


  -- ----------------------------------------------------------
  -- PAID REGISTRATIONS MUST NOT BECOME GOING YET
  --
  -- Payment integration will change Pending → Going only
  -- after verified payment.
  -- ----------------------------------------------------------

  insert into public.event_registrations (
    event_id,
    student_id,
    student_name,
    student_email,
    department,
    graduation_year,

    status,

    registration_source,
    verified_campus_uid,

    fee_amount_paise,
    payment_status,

    updated_at
  )
  values (
    p_event_id,
    auth.uid(),

    coalesce(
      profile_row.full_name,
      ''
    ),

    coalesce(
      profile_row.email,
      ''
    ),

    coalesce(
      profile_row.department,
      ''
    ),

    coalesce(
      profile_row.graduation_year,
      ''
    ),

    case
      when calculated_fee = 0
        then 'Going'
      else 'Cancelled'
    end,

    'RNSIT',

    profile_row.campus_uid,

    calculated_fee,

    case
      when calculated_fee = 0
        then 'Not Required'
      else 'Pending'
    end,

    now()
  )

  on conflict (
    event_id,
    student_id
  )

  do update set

    student_name =
      excluded.student_name,

    student_email =
      excluded.student_email,

    department =
      excluded.department,

    graduation_year =
      excluded.graduation_year,

    registration_source =
      'RNSIT',

    verified_campus_uid =
      excluded.verified_campus_uid,

    fee_amount_paise =
      excluded.fee_amount_paise,

    payment_status =
      case
        when excluded.fee_amount_paise = 0
          then 'Not Required'

        when
          public.event_registrations.payment_status =
          'Paid'
          then 'Paid'

        else 'Pending'
      end,

    status =
      case
        when excluded.fee_amount_paise = 0
          then 'Going'

        when
          public.event_registrations.payment_status =
          'Paid'
          then 'Going'

        else 'Cancelled'
      end,

    updated_at =
      now()

  returning *
  into registration_row;


  return jsonb_build_object(

    'success',
    true,

    'registration_id',
    registration_row.id,

    'event_id',
    registration_row.event_id,

    'registration_source',
    'RNSIT',

    'campus_uid',
    registration_row.verified_campus_uid,

    'fee_amount_paise',
    registration_row.fee_amount_paise,

    'fee_amount_rupees',
    registration_row.fee_amount_paise / 100.0,

    'payment_required',
    registration_row.fee_amount_paise > 0
      and registration_row.payment_status <> 'Paid',

    'payment_status',
    registration_row.payment_status,

    'registration_status',
    registration_row.status

  );

end;
$$;


revoke all
on function
public.register_for_campus_event(uuid)
from public, anon;

grant execute
on function
public.register_for_campus_event(uuid)
to authenticated;


commit;
