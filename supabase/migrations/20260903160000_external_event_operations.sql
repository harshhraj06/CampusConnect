-- ============================================================
-- CAMPUSCONNECT
-- EXTERNAL EVENT OPERATIONS V1
--
-- Secure organizer/operator access to external registrations.
-- Does NOT expose pass secrets.
-- Does NOT weaken RLS.
-- ============================================================

begin;


-- ============================================================
-- 1. EXTERNAL EVENT OPERATIONS ROSTER
-- ============================================================

create or replace function
public.get_external_event_operations_roster(
  p_event_id uuid
)
returns table (
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
set search_path =
  pg_catalog,
  public
as $$
declare

  caller_role text;

  event_creator uuid;

begin

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  caller_role :=
    coalesce(
      public.current_campus_role()::text,
      ''
    );


  select
    campus_event.created_by

  into
    event_creator

  from
    public.campus_events
      as campus_event

  where
    campus_event.id =
      p_event_id;


  if event_creator is null then
    raise exception
      'Event not found.';
  end if;


  -- Keep authorization aligned with the existing
  -- secure event operations roster.
  if not (
    caller_role in (
      'Volunteer',
      'Coordinator',
      'Main Admin'
    )
    or event_creator = auth.uid()
  ) then

    raise exception
      'You do not have permission to view this event roster.';

  end if;


  return query

  select

    registration.id,

    registration.event_id,

    registration.full_name,

    registration.email,

    registration.phone,

    registration.college_name,

    registration.department,

    registration.graduation_year,

    registration.fee_amount_paise,

    registration.payment_status,

    registration.registration_status,

    registration.registered_at,

    coalesce(
      registration.checked_in,
      false
    ),

    registration.checked_in_at,

    registration.checked_in_by,

    registration.updated_at

  from
    public.external_event_registrations
      as registration

  where
    registration.event_id =
      p_event_id

  order by
    registration.registered_at asc;

end;
$$;


revoke all
on function
public.get_external_event_operations_roster(uuid)
from public, anon;


grant execute
on function
public.get_external_event_operations_roster(uuid)
to authenticated;



-- ============================================================
-- 2. COMBINED OPERATIONS SUMMARY
--
-- This is deliberately separate from the existing
-- get_event_registration_summary RPC so we don't risk
-- breaking student-facing capacity UI.
-- ============================================================

create or replace function
public.get_event_operations_summary(
  p_event_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path =
  pg_catalog,
  public
as $$
declare

  caller_role text;

  event_row
    public.campus_events%rowtype;

  rnsit_confirmed bigint := 0;

  external_confirmed bigint := 0;

  external_pending bigint := 0;

  rnsit_paid bigint := 0;

  external_paid bigint := 0;

  total_confirmed bigint := 0;

  checked_in_count bigint := 0;

  collected_revenue_paise bigint := 0;

begin

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  caller_role :=
    coalesce(
      public.current_campus_role()::text,
      ''
    );


  select
    campus_event.*

  into
    event_row

  from
    public.campus_events
      as campus_event

  where
    campus_event.id =
      p_event_id

  limit 1;


  if not found then
    raise exception
      'Event not found.';
  end if;


  if not (
    caller_role in (
      'Volunteer',
      'Coordinator',
      'Main Admin'
    )
    or event_row.created_by =
      auth.uid()
  ) then

    raise exception
      'You do not have permission to view event operations.';

  end if;


  -- ----------------------------------------------------------
  -- RNSIT confirmed
  -- ----------------------------------------------------------

  select count(*)

  into rnsit_confirmed

  from public.event_registrations
    as registration

  where
    registration.event_id =
      p_event_id

    and registration.status =
      'Going';


  -- ----------------------------------------------------------
  -- External confirmed
  -- ----------------------------------------------------------

  select count(*)

  into external_confirmed

  from public.external_event_registrations
    as registration

  where
    registration.event_id =
      p_event_id

    and registration.registration_status =
      'Confirmed';


  -- ----------------------------------------------------------
  -- External pending
  -- ----------------------------------------------------------

  select count(*)

  into external_pending

  from public.external_event_registrations
    as registration

  where
    registration.event_id =
      p_event_id

    and registration.registration_status =
      'Pending';


  -- ----------------------------------------------------------
  -- Paid registrations
  -- ----------------------------------------------------------

  select count(*)

  into rnsit_paid

  from public.event_registrations
    as registration

  where
    registration.event_id =
      p_event_id

    and registration.payment_status =
      'Paid';


  select count(*)

  into external_paid

  from public.external_event_registrations
    as registration

  where
    registration.event_id =
      p_event_id

    and registration.payment_status =
      'Paid';


  -- ----------------------------------------------------------
  -- Combined confirmed
  -- ----------------------------------------------------------

  total_confirmed :=
    rnsit_confirmed +
    external_confirmed;


  -- ----------------------------------------------------------
  -- Combined check-ins
  -- ----------------------------------------------------------

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

  into checked_in_count;


  -- ----------------------------------------------------------
  -- VERIFIED/COLLECTED REVENUE ONLY
  --
  -- Pending payments are deliberately excluded.
  -- ----------------------------------------------------------

  select

    coalesce(
      (
        select sum(
          registration.fee_amount_paise
        )
        from public.event_registrations
          as registration
        where
          registration.event_id =
            p_event_id
          and registration.payment_status =
            'Paid'
      ),
      0
    )

    +

    coalesce(
      (
        select sum(
          registration.fee_amount_paise
        )
        from public.external_event_registrations
          as registration
        where
          registration.event_id =
            p_event_id
          and registration.payment_status =
            'Paid'
      ),
      0
    )

  into collected_revenue_paise;


  return jsonb_build_object(

    'success',
    true,

    'event_id',
    event_row.id,

    'rnsit_confirmed',
    rnsit_confirmed,

    'external_confirmed',
    external_confirmed,

    'external_pending',
    external_pending,

    'total_confirmed',
    total_confirmed,

    'rnsit_paid',
    rnsit_paid,

    'external_paid',
    external_paid,

    'checked_in',
    checked_in_count,

    'capacity',
    event_row.capacity,

    'seats_remaining',
    case

      when
        event_row.capacity is null
        or event_row.capacity <= 0
      then null

      else
        greatest(
          event_row.capacity::bigint -
          total_confirmed,
          0::bigint
        )

    end,

    'collected_revenue_paise',
    collected_revenue_paise,

    'external_registration_enabled',
    coalesce(
      event_row.external_registration_enabled,
      false
    ),

    'external_fee_paise',
    greatest(
      coalesce(
        event_row.external_fee_paise,
        0
      ),
      0
    ),

    'public_registration_slug',
    event_row.public_registration_slug

  );

end;
$$;


revoke all
on function
public.get_event_operations_summary(uuid)
from public, anon;


grant execute
on function
public.get_event_operations_summary(uuid)
to authenticated;


commit;

notify pgrst, 'reload schema';
