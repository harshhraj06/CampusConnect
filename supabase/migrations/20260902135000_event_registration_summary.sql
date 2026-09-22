-- Safe event registration totals for every authenticated user.
-- No attendee identity, email, registration ID or pass code is exposed.

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
  event_row
    public.campus_events%rowtype;

  going_count bigint;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  select *
  into event_row
  from public.campus_events
  where id = p_event_id;

  if not found then
    raise exception
      'Event was not found.';
  end if;

  if event_row.status <> 'Published'
     and event_row.created_by is distinct from auth.uid()
     and coalesce(
       public.current_campus_role()::text,
       ''
     ) <> 'Main Admin'
  then
    raise exception
      'This event is not available.';
  end if;

  select count(*)
  into going_count
  from public.event_registrations
  where
    event_registrations.event_id =
      p_event_id
    and status = 'Going';

  return query
  select
    event_row.id,

    going_count,

    event_row.capacity,

    case
      when event_row.capacity is null
        or event_row.capacity <= 0
      then null
      else greatest(
        event_row.capacity::bigint -
          going_count,
        0::bigint
      )
    end,

    case
      when event_row.capacity is null
        or event_row.capacity <= 0
      then 0::numeric
      else least(
        100::numeric,
        round(
          going_count::numeric *
            100::numeric /
            event_row.capacity::numeric,
          1
        )
      )
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
