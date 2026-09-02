-- Validate published event schedules and enable realtime updates.

create or replace function
  public.validate_campus_event_schedule()
returns trigger
language plpgsql
security definer
set search_path =
  pg_catalog,
  public
as $$
begin
  if new.status = 'Published' then
    if new.event_date is null then
      raise exception
        'Event start date is required.';
    end if;

    if new.end_date is not null
      and new.end_date <= new.event_date
    then
      raise exception
        'Event end date must be after the start date.';
    end if;

    if new.registration_deadline is not null
      and new.registration_deadline >
        new.event_date
    then
      raise exception
        'Registration deadline must be before the event starts.';
    end if;

    if new.capacity is not null
      and new.capacity <= 0
    then
      raise exception
        'Event capacity must be greater than zero.';
    end if;

    if tg_op = 'INSERT'
      and new.event_date <= now()
    then
      raise exception
        'A published event must start in the future.';
    end if;

    if tg_op = 'UPDATE'
      and (
        old.event_date is distinct from
          new.event_date
        or old.status is distinct from
          new.status
      )
      and new.event_date <= now()
    then
      raise exception
        'A published event must start in the future.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists
  validate_campus_event_schedule_trigger
on public.campus_events;

create trigger
  validate_campus_event_schedule_trigger
before insert or update
on public.campus_events
for each row
execute function
  public.validate_campus_event_schedule();


-- Add events to Supabase Realtime only if not already enabled.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where
      pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'campus_events'
  ) then
    alter publication
      supabase_realtime
    add table
      public.campus_events;
  end if;
end;
$$;

notify pgrst, 'reload schema';
