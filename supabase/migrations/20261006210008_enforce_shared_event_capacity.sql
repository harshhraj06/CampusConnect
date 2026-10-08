create or replace function public.enforce_shared_event_capacity()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_capacity integer;

  v_internal_count bigint := 0;
  v_external_count bigint := 0;

  v_should_check boolean := false;

  v_internal_exclude_id uuid := null;
  v_external_exclude_id uuid := null;
begin
  if tg_table_name = 'event_registrations' then

    if tg_op = 'INSERT' then
      v_should_check :=
        new.status = 'Going';

    elsif tg_op = 'UPDATE' then
      v_should_check :=
        new.status = 'Going'
        and (
          old.status is distinct from 'Going'
          or old.event_id is distinct from new.event_id
        );

      v_internal_exclude_id :=
        old.id;
    end if;

  elsif tg_table_name =
    'external_event_registrations'
  then

    if tg_op = 'INSERT' then
      v_should_check :=
        new.registration_status = 'Confirmed';

    elsif tg_op = 'UPDATE' then
      v_should_check :=
        new.registration_status = 'Confirmed'
        and (
          old.registration_status
            is distinct from 'Confirmed'
          or old.event_id
            is distinct from new.event_id
        );

      v_external_exclude_id :=
        old.id;
    end if;

  end if;

  if not v_should_check then
    return new;
  end if;

  select
    event.capacity
  into
    v_capacity
  from
    public.campus_events event
  where
    event.id =
      new.event_id
  for update;

  if not found then
    raise exception
      'Event not found.';
  end if;

  if
    v_capacity is null
    or v_capacity <= 0
  then
    return new;
  end if;

  select
    count(*)
  into
    v_internal_count
  from
    public.event_registrations registration
  where
    registration.event_id =
      new.event_id
    and registration.status =
      'Going'
    and (
      v_internal_exclude_id is null
      or registration.id <>
        v_internal_exclude_id
    );

  select
    count(*)
  into
    v_external_count
  from
    public.external_event_registrations registration
  where
    registration.event_id =
      new.event_id
    and registration.registration_status =
      'Confirmed'
    and (
      v_external_exclude_id is null
      or registration.id <>
        v_external_exclude_id
    );

  if
    v_internal_count +
    v_external_count >=
    v_capacity
  then
    raise exception
      'This event is full.';
  end if;

  return new;
end;
$function$;

revoke execute
on function public.enforce_shared_event_capacity()
from public, anon, authenticated;

drop trigger if exists
  trg_enforce_internal_event_capacity
on public.event_registrations;

create trigger
  trg_enforce_internal_event_capacity
before insert or update
on public.event_registrations
for each row
execute function
  public.enforce_shared_event_capacity();

drop trigger if exists
  trg_enforce_external_event_capacity
on public.external_event_registrations;

create trigger
  trg_enforce_external_event_capacity
before insert or update
on public.external_event_registrations
for each row
execute function
  public.enforce_shared_event_capacity();

notify pgrst, 'reload schema';
