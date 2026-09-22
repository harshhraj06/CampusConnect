-- ============================================================
-- CAMPUSCONNECT
-- COMBINED EVENT REGISTRATION SUMMARY
--
-- Aggregate only:
-- RNSIT Going + External Confirmed
--
-- No attendee details / QR / barcode / claim tokens exposed.
-- ============================================================

begin;


create or replace function
public.get_event_registration_summary(
  p_event_id uuid
)
returns table (
  event_id uuid,
  registered_count bigint,
  event_capacity integer,
  seats_remaining bigint,
  filled_percent numeric
)
language plpgsql
stable
security definer
set search_path =
  pg_catalog,
  public
as $$
declare

  internal_count bigint := 0;
  external_count bigint := 0;
  total_count bigint := 0;

  capacity_value integer;

begin

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;


  select
    event.capacity

  into
    capacity_value

  from
    public.campus_events
      as event

  where
    event.id =
      p_event_id

  limit 1;


  if not found then
    raise exception
      'Event not found.';
  end if;


  select
    count(*)

  into
    internal_count

  from
    public.event_registrations
      as registration

  where
    registration.event_id =
      p_event_id

    and registration.status =
      'Going';


  select
    count(*)

  into
    external_count

  from
    public.external_event_registrations
      as registration

  where
    registration.event_id =
      p_event_id

    and registration.registration_status =
      'Confirmed';


  total_count :=
    internal_count +
    external_count;


  return query

  select

    p_event_id,

    total_count,

    capacity_value,

    case

      when
        capacity_value is not null
        and capacity_value > 0

      then
        greatest(
          capacity_value::bigint -
          total_count,
          0::bigint
        )

      else
        null::bigint

    end,

    case

      when
        capacity_value is not null
        and capacity_value > 0

      then
        least(
          100::numeric,
          round(
            (
              total_count::numeric /
              capacity_value::numeric
            ) * 100,
            2
          )
        )

      else
        0::numeric

    end;

end;
$$;


revoke all
on function
public.get_event_registration_summary(uuid)
from public, anon;


grant execute
on function
public.get_event_registration_summary(uuid)
to authenticated;


commit;

notify pgrst, 'reload schema';
