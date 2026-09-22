-- ============================================================
-- CAMPUSCONNECT — FACULTY AVAILABILITY FOUNDATION
--
-- Foundation for the ECE Faculty Coverage Engine.
--
-- IMPORTANT:
-- 1. A free timetable period does NOT automatically mean that
--    a faculty member is available for substitution.
-- 2. Faculty explicitly opt in to recurring availability.
-- 3. Date-specific unavailability overrides recurring
--    availability.
-- 4. Permanent timetable rows are not modified here.
-- 5. Substitute assignment / accept / decline is intentionally
--    NOT implemented in this migration.
-- ============================================================


-- ============================================================
-- 1. RECURRING FACULTY AVAILABILITY
-- ============================================================

create table if not exists
public.faculty_recurring_availability (
  id uuid primary key
    default gen_random_uuid(),

  faculty_id uuid not null
    references auth.users(id)
    on delete cascade,

  profile_id uuid not null
    references public.timetable_scheduling_profiles(id)
    on delete cascade,

  period_slot_id uuid not null
    references public.timetable_period_slots(id)
    on delete cascade,

  day_of_week text not null
    check (
      day_of_week in (
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
      )
    ),

  is_available boolean not null
    default true,

  note text not null
    default '',

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique (
    faculty_id,
    profile_id,
    day_of_week,
    period_slot_id
  ),

  check (
    char_length(note) <= 500
  )
);


create index if not exists
faculty_recurring_availability_faculty_idx
on public.faculty_recurring_availability(
  faculty_id,
  profile_id,
  day_of_week
);


create index if not exists
faculty_recurring_availability_lookup_idx
on public.faculty_recurring_availability(
  profile_id,
  day_of_week,
  period_slot_id,
  is_available
);


-- ============================================================
-- 2. DATE-SPECIFIC FACULTY UNAVAILABILITY
--
-- period_slot_id = NULL means unavailable for the whole day.
-- A period_slot_id means unavailable only for that slot.
-- ============================================================

create table if not exists
public.faculty_unavailability (
  id uuid primary key
    default gen_random_uuid(),

  faculty_id uuid not null
    references auth.users(id)
    on delete cascade,

  profile_id uuid not null
    references public.timetable_scheduling_profiles(id)
    on delete cascade,

  unavailable_date date not null,

  period_slot_id uuid
    references public.timetable_period_slots(id)
    on delete cascade,

  reason text not null
    default '',

  status text not null
    default 'Active'
    check (
      status in (
        'Active',
        'Cancelled'
      )
    ),

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  check (
    char_length(reason) <= 500
  )
);


-- PostgreSQL UNIQUE treats NULL values as distinct, therefore
-- whole-day and slot-specific uniqueness are enforced with
-- partial indexes.


create unique index if not exists
faculty_unavailability_whole_day_unique_idx
on public.faculty_unavailability(
  faculty_id,
  profile_id,
  unavailable_date
)
where period_slot_id is null
and status = 'Active';


create unique index if not exists
faculty_unavailability_slot_unique_idx
on public.faculty_unavailability(
  faculty_id,
  profile_id,
  unavailable_date,
  period_slot_id
)
where period_slot_id is not null
and status = 'Active';


create index if not exists
faculty_unavailability_lookup_idx
on public.faculty_unavailability(
  faculty_id,
  unavailable_date,
  status
);


-- ============================================================
-- 3. VALIDATION
--
-- Prevent a period slot from being attached to the wrong
-- scheduling profile.
-- ============================================================

create or replace function
public.validate_faculty_availability_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if not exists (
    select 1
    from public.timetable_period_slots slot
    where slot.id =
      new.period_slot_id

      and slot.profile_id =
        new.profile_id

      and slot.is_teaching_slot =
        true
  ) then

    raise exception
      'Availability must reference a teaching period from the selected scheduling profile';

  end if;


  new.updated_at :=
    now();


  return new;
end;
$$;


drop trigger if exists
validate_faculty_recurring_availability_trigger
on public.faculty_recurring_availability;


create trigger
validate_faculty_recurring_availability_trigger
before insert or update
on public.faculty_recurring_availability
for each row
execute function
public.validate_faculty_availability_reference();


-- ============================================================
-- 4. UNAVAILABILITY VALIDATION
-- ============================================================

create or replace function
public.validate_faculty_unavailability_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if new.period_slot_id is not null then

    if not exists (
      select 1
      from public.timetable_period_slots slot
      where slot.id =
        new.period_slot_id

        and slot.profile_id =
          new.profile_id

        and slot.is_teaching_slot =
          true
    ) then

      raise exception
        'Unavailability period must belong to the selected scheduling profile';

    end if;

  end if;


  new.updated_at :=
    now();


  return new;
end;
$$;


drop trigger if exists
validate_faculty_unavailability_trigger
on public.faculty_unavailability;


create trigger
validate_faculty_unavailability_trigger
before insert or update
on public.faculty_unavailability
for each row
execute function
public.validate_faculty_unavailability_reference();


-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

alter table
public.faculty_recurring_availability
enable row level security;


alter table
public.faculty_unavailability
enable row level security;


grant select, insert, update, delete
on public.faculty_recurring_availability
to authenticated;


grant select, insert, update, delete
on public.faculty_unavailability
to authenticated;


-- ============================================================
-- 6. RECURRING AVAILABILITY POLICIES
--
-- Faculty manage only their own availability.
-- Main Admin may read availability for coverage operations.
-- ============================================================

drop policy if exists
"Faculty read own recurring availability"
on public.faculty_recurring_availability;


create policy
"Faculty read own recurring availability"
on public.faculty_recurring_availability
for select
to authenticated
using (
  faculty_id =
    (select auth.uid())

  or public.current_campus_role() =
    'Main Admin'
);


drop policy if exists
"Faculty create own recurring availability"
on public.faculty_recurring_availability;


create policy
"Faculty create own recurring availability"
on public.faculty_recurring_availability
for insert
to authenticated
with check (
  faculty_id =
    (select auth.uid())

  and public.current_campus_role() =
    'Faculty'
);


drop policy if exists
"Faculty update own recurring availability"
on public.faculty_recurring_availability;


create policy
"Faculty update own recurring availability"
on public.faculty_recurring_availability
for update
to authenticated
using (
  faculty_id =
    (select auth.uid())

  and public.current_campus_role() =
    'Faculty'
)
with check (
  faculty_id =
    (select auth.uid())

  and public.current_campus_role() =
    'Faculty'
);


drop policy if exists
"Faculty delete own recurring availability"
on public.faculty_recurring_availability;


create policy
"Faculty delete own recurring availability"
on public.faculty_recurring_availability
for delete
to authenticated
using (
  faculty_id =
    (select auth.uid())

  and public.current_campus_role() =
    'Faculty'
);


-- ============================================================
-- 7. UNAVAILABILITY POLICIES
-- ============================================================

drop policy if exists
"Faculty read own unavailability"
on public.faculty_unavailability;


create policy
"Faculty read own unavailability"
on public.faculty_unavailability
for select
to authenticated
using (
  faculty_id =
    (select auth.uid())

  or public.current_campus_role() =
    'Main Admin'
);


drop policy if exists
"Faculty create own unavailability"
on public.faculty_unavailability;


create policy
"Faculty create own unavailability"
on public.faculty_unavailability
for insert
to authenticated
with check (
  faculty_id =
    (select auth.uid())

  and public.current_campus_role() =
    'Faculty'
);


drop policy if exists
"Faculty update own unavailability"
on public.faculty_unavailability;


create policy
"Faculty update own unavailability"
on public.faculty_unavailability
for update
to authenticated
using (
  faculty_id =
    (select auth.uid())

  and public.current_campus_role() =
    'Faculty'
)
with check (
  faculty_id =
    (select auth.uid())

  and public.current_campus_role() =
    'Faculty'
);


drop policy if exists
"Faculty delete own unavailability"
on public.faculty_unavailability;


create policy
"Faculty delete own unavailability"
on public.faculty_unavailability
for delete
to authenticated
using (
  faculty_id =
    (select auth.uid())

  and public.current_campus_role() =
    'Faculty'
);


-- ============================================================
-- 8. FACULTY PERSONAL AVAILABILITY RPC
--
-- Returns the faculty member's scheduling periods together
-- with their explicit recurring availability.
--
-- This does NOT claim that the faculty member is actually free.
-- Timetable collisions are evaluated separately by the future
-- Coverage Engine.
-- ============================================================

create or replace function
public.get_my_faculty_availability(
  p_profile_id uuid
)
returns table (
  day_of_week text,
  display_order integer,

  period_slot_id uuid,
  period_order integer,
  period_label text,
  start_time time,
  end_time time,

  is_available boolean,
  availability_note text
)
language sql
security invoker
set search_path = ''
as $$

  select
    day.day_of_week,
    day.display_order,

    slot.id as period_slot_id,
    slot.period_order,
    slot.label as period_label,
    slot.start_time,
    slot.end_time,

    coalesce(
      availability.is_available,
      false
    ) as is_available,

    coalesce(
      availability.note,
      ''
    ) as availability_note

  from
    public.timetable_working_days day

  join
    public.timetable_period_slots slot
      on slot.profile_id =
        day.profile_id

  left join
    public.faculty_recurring_availability availability
      on availability.faculty_id =
        (select auth.uid())

      and availability.profile_id =
        day.profile_id

      and availability.day_of_week =
        day.day_of_week

      and availability.period_slot_id =
        slot.id

  where
    day.profile_id =
      p_profile_id

    and day.is_working_day =
      true

    and slot.is_teaching_slot =
      true

  order by
    day.display_order,
    slot.period_order;

$$;


grant execute
on function
public.get_my_faculty_availability(uuid)
to authenticated;


-- ============================================================
-- 9. COMMENTS
-- ============================================================

comment on table
public.faculty_recurring_availability
is
'Faculty-controlled recurring opt-in availability for substitution. Availability does not imply timetable freedom.';


comment on table
public.faculty_unavailability
is
'Date-specific faculty unavailability. NULL period_slot_id means unavailable for the whole day.';


notify pgrst, 'reload schema';
