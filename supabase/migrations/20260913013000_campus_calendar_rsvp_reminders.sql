-- ============================================================
-- CAMPUSCONNECT — CAMPUS CALENDAR RSVP AND REMINDERS
-- Additive migration. Existing calendar data is preserved.
-- ============================================================

create table if not exists
public.campus_calendar_rsvps (
  id uuid primary key
    default gen_random_uuid(),

  item_source text not null
    check (
      item_source in (
        'calendar',
        'campus-event',
        'placement'
      )
    ),

  item_id uuid not null,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  response text not null
    default 'interested'
    check (
      response in (
        'interested',
        'going',
        'not_going'
      )
    ),

  reminder_enabled boolean not null
    default true,

  reminder_minutes_before integer not null
    default 60
    check (
      reminder_minutes_before
      between 5 and 10080
    ),

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint campus_calendar_rsvps_unique_response
    unique (
      item_source,
      item_id,
      user_id
    )
);


create index if not exists
  campus_calendar_rsvps_item_idx
on public.campus_calendar_rsvps(
  item_source,
  item_id
);


create index if not exists
  campus_calendar_rsvps_user_idx
on public.campus_calendar_rsvps(
  user_id,
  updated_at desc
);


alter table
public.campus_calendar_rsvps
enable row level security;


drop policy if exists
  "Users read own calendar RSVP"
on public.campus_calendar_rsvps;

create policy
  "Users read own calendar RSVP"
on public.campus_calendar_rsvps
for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_manage_student_calendar()
);


drop policy if exists
  "Users create own calendar RSVP"
on public.campus_calendar_rsvps;

create policy
  "Users create own calendar RSVP"
on public.campus_calendar_rsvps
for insert
to authenticated
with check (
  user_id = auth.uid()
);


drop policy if exists
  "Users update own calendar RSVP"
on public.campus_calendar_rsvps;

create policy
  "Users update own calendar RSVP"
on public.campus_calendar_rsvps
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);


drop policy if exists
  "Users delete own calendar RSVP"
on public.campus_calendar_rsvps;

create policy
  "Users delete own calendar RSVP"
on public.campus_calendar_rsvps
for delete
to authenticated
using (
  user_id = auth.uid()
);


grant select, insert, update, delete
on public.campus_calendar_rsvps
to authenticated;


create or replace function
public.set_campus_calendar_rsvp_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists
  campus_calendar_rsvps_updated_at
on public.campus_calendar_rsvps;

create trigger
  campus_calendar_rsvps_updated_at
before update
on public.campus_calendar_rsvps
for each row
execute function
  public.set_campus_calendar_rsvp_updated_at();


create or replace function
public.get_campus_calendar_rsvp_counts(
  requested_source text,
  requested_item_id uuid
)
returns table (
  interested_count bigint,
  going_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (
      where response = 'interested'
    ) as interested_count,

    count(*) filter (
      where response = 'going'
    ) as going_count

  from public.campus_calendar_rsvps

  where
    item_source = requested_source
    and item_id = requested_item_id;
$$;


revoke all
on function
public.get_campus_calendar_rsvp_counts(
  text,
  uuid
)
from public;

grant execute
on function
public.get_campus_calendar_rsvp_counts(
  text,
  uuid
)
to authenticated;


create or replace function
public.get_my_upcoming_calendar_reminders()
returns table (
  rsvp_id uuid,
  item_source text,
  item_id uuid,
  response text,
  reminder_minutes_before integer,
  reminder_enabled boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    rsvp.id,
    rsvp.item_source,
    rsvp.item_id,
    rsvp.response,
    rsvp.reminder_minutes_before,
    rsvp.reminder_enabled

  from public.campus_calendar_rsvps
    as rsvp

  where
    rsvp.user_id = auth.uid()
    and rsvp.reminder_enabled = true
    and rsvp.response in (
      'interested',
      'going'
    )

  order by
    rsvp.updated_at desc;
$$;


revoke all
on function
public.get_my_upcoming_calendar_reminders()
from public;

grant execute
on function
public.get_my_upcoming_calendar_reminders()
to authenticated;
