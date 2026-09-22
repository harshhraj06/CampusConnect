-- ============================================================
-- CAMPUSCONNECT — TIMETABLE SCHEDULING CONFIGURATION
--
-- Foundation for the automated timetable generator.
--
-- No fake/default college timings or rooms are inserted.
-- Main Admin will configure real ECE values through the UI.
-- ============================================================


-- ============================================================
-- 1. SCHEDULING PROFILE
-- ============================================================

create table if not exists
public.timetable_scheduling_profiles (
  id uuid primary key
    default gen_random_uuid(),

  name text not null,

  department text not null,

  academic_year text not null
    default '',

  semester text not null
    default '',

  is_active boolean not null
    default true,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  check (
    char_length(trim(name))
    between 2 and 120
  ),

  check (
    char_length(trim(department))
    between 2 and 80
  )
);


create index if not exists
timetable_scheduling_profiles_department_idx
on public.timetable_scheduling_profiles(
  department,
  is_active
);


-- ============================================================
-- 2. BATCH -> SCHEDULING PROFILE
-- ============================================================

create table if not exists
public.timetable_batch_profiles (
  batch_id uuid primary key
    references public.attendance_batches(id)
    on delete cascade,

  profile_id uuid not null
    references public.timetable_scheduling_profiles(id)
    on delete restrict,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
timetable_batch_profiles_profile_idx
on public.timetable_batch_profiles(
  profile_id
);


-- ============================================================
-- 3. WORKING DAYS
-- ============================================================

create table if not exists
public.timetable_working_days (
  id uuid primary key
    default gen_random_uuid(),

  profile_id uuid not null
    references public.timetable_scheduling_profiles(id)
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

  display_order integer not null
    check (
      display_order
      between 1 and 6
    ),

  is_working_day boolean not null
    default true,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique (
    profile_id,
    day_of_week
  ),

  unique (
    profile_id,
    display_order
  )
);


-- ============================================================
-- 4. PERIOD SLOTS
-- ============================================================

create table if not exists
public.timetable_period_slots (
  id uuid primary key
    default gen_random_uuid(),

  profile_id uuid not null
    references public.timetable_scheduling_profiles(id)
    on delete cascade,

  period_order integer not null
    check (
      period_order
      between 1 and 20
    ),

  label text not null
    default '',

  start_time time not null,

  end_time time not null,

  is_teaching_slot boolean not null
    default true,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  check (
    end_time > start_time
  ),

  unique (
    profile_id,
    period_order
  ),

  unique (
    profile_id,
    start_time,
    end_time
  )
);


create index if not exists
timetable_period_slots_profile_idx
on public.timetable_period_slots(
  profile_id,
  period_order
);


-- ============================================================
-- 5. PHYSICAL RESOURCES
-- ============================================================

create table if not exists
public.timetable_resources (
  id uuid primary key
    default gen_random_uuid(),

  department text not null,

  resource_code text not null,

  resource_name text not null,

  resource_type text not null
    check (
      resource_type in (
        'Classroom',
        'Laboratory',
        'Seminar Hall',
        'Other'
      )
    ),

  building text not null
    default '',

  floor text not null
    default '',

  capacity integer,

  is_active boolean not null
    default true,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  check (
    char_length(trim(department))
    between 2 and 80
  ),

  check (
    char_length(trim(resource_code))
    between 1 and 40
  ),

  check (
    char_length(trim(resource_name))
    between 2 and 120
  ),

  check (
    capacity is null
    or capacity > 0
  ),

  unique (
    department,
    resource_code
  )
);


create index if not exists
timetable_resources_department_idx
on public.timetable_resources(
  department,
  resource_type,
  is_active
);


-- ============================================================
-- 6. LINK STRUCTURED TIMETABLE TO RESOURCE
-- ============================================================

alter table
public.batch_timetable_entries
add column if not exists
resource_id uuid
references public.timetable_resources(id)
on delete set null;


create index if not exists
batch_timetable_resource_idx
on public.batch_timetable_entries(
  resource_id,
  day_of_week,
  start_time
)
where resource_id is not null;


-- ============================================================
-- 7. CONFIGURATION VALIDATION
-- ============================================================

create or replace function
public.validate_timetable_configuration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch_department text;
  profile_department text;
begin

  if tg_table_name =
    'timetable_scheduling_profiles'
  then

    new.name :=
      trim(new.name);

    new.department :=
      upper(trim(new.department));

    new.academic_year :=
      trim(new.academic_year);

    new.semester :=
      trim(new.semester);

    new.updated_at :=
      now();

    return new;

  end if;


  if tg_table_name =
    'timetable_batch_profiles'
  then

    select
      upper(trim(b.department))
    into
      batch_department
    from
      public.attendance_batches b
    where
      b.id = new.batch_id;


    select
      upper(trim(p.department))
    into
      profile_department
    from
      public.timetable_scheduling_profiles p
    where
      p.id = new.profile_id;


    if batch_department is null then
      raise exception
        'Selected batch does not exist';
    end if;


    if profile_department is null then
      raise exception
        'Selected scheduling profile does not exist';
    end if;


    if batch_department <>
      profile_department
    then
      raise exception
        'Batch and scheduling profile departments must match';
    end if;


    new.updated_at :=
      now();

    return new;

  end if;


  if tg_table_name =
    'timetable_resources'
  then

    new.department :=
      upper(trim(new.department));

    new.resource_code :=
      upper(trim(new.resource_code));

    new.resource_name :=
      trim(new.resource_name);

    new.building :=
      trim(new.building);

    new.floor :=
      trim(new.floor);

    new.updated_at :=
      now();

    return new;

  end if;


  return new;
end;
$$;


drop trigger if exists
validate_timetable_scheduling_profile_trigger
on public.timetable_scheduling_profiles;

create trigger
validate_timetable_scheduling_profile_trigger
before insert or update
on public.timetable_scheduling_profiles
for each row
execute function
public.validate_timetable_configuration();


drop trigger if exists
validate_timetable_batch_profile_trigger
on public.timetable_batch_profiles;

create trigger
validate_timetable_batch_profile_trigger
before insert or update
on public.timetable_batch_profiles
for each row
execute function
public.validate_timetable_configuration();


drop trigger if exists
validate_timetable_resource_trigger
on public.timetable_resources;

create trigger
validate_timetable_resource_trigger
before insert or update
on public.timetable_resources
for each row
execute function
public.validate_timetable_configuration();


-- ============================================================
-- 8. PREVENT OVERLAPPING PERIOD SLOT DEFINITIONS
-- ============================================================

create or replace function
public.validate_timetable_period_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  new.label :=
    trim(new.label);


  if exists (
    select 1
    from
      public.timetable_period_slots existing
    where
      existing.profile_id =
        new.profile_id

      and existing.id <>
        new.id

      and new.start_time <
        existing.end_time

      and new.end_time >
        existing.start_time
  ) then

    raise exception
      'Timetable period slots cannot overlap';

  end if;


  new.updated_at :=
    now();

  return new;
end;
$$;


drop trigger if exists
validate_timetable_period_slot_trigger
on public.timetable_period_slots;

create trigger
validate_timetable_period_slot_trigger
before insert or update
on public.timetable_period_slots
for each row
execute function
public.validate_timetable_period_slot();


-- ============================================================
-- 9. RESOURCE COLLISION IN PUBLISHED TIMETABLE
-- ============================================================

create or replace function
public.validate_timetable_resource_collision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if new.resource_id is null then
    return new;
  end if;


  if not exists (
    select 1
    from
      public.timetable_resources resource
    join
      public.attendance_batches batch
      on batch.id =
        new.batch_id
    where
      resource.id =
        new.resource_id

      and upper(
        trim(
          resource.department
        )
      ) =
        upper(
          trim(
            batch.department
          )
        )

      and resource.is_active
  ) then

    raise exception
      'Selected timetable resource is unavailable for this department';

  end if;


  if exists (
    select 1
    from
      public.batch_timetable_entries existing
    where
      existing.resource_id =
        new.resource_id

      and existing.day_of_week =
        new.day_of_week

      and existing.id <>
        new.id

      and new.start_time <
        existing.end_time

      and new.end_time >
        existing.start_time
  ) then

    raise exception
      'Room or laboratory is already occupied during this time';

  end if;


  return new;
end;
$$;


drop trigger if exists
validate_timetable_resource_collision_trigger
on public.batch_timetable_entries;

create trigger
validate_timetable_resource_collision_trigger
before insert or update
on public.batch_timetable_entries
for each row
execute function
public.validate_timetable_resource_collision();


-- ============================================================
-- 10. RLS
--
-- Current CampusConnect authorization model:
-- Main Admin manages scheduling configuration.
--
-- HOD authorization will be added after the existing
-- campus_faculty -> authenticated-user mapping is established.
-- Do not implement HOD authorization client-side.
-- ============================================================

alter table
public.timetable_scheduling_profiles
enable row level security;

alter table
public.timetable_batch_profiles
enable row level security;

alter table
public.timetable_working_days
enable row level security;

alter table
public.timetable_period_slots
enable row level security;

alter table
public.timetable_resources
enable row level security;


grant select, insert, update, delete
on public.timetable_scheduling_profiles
to authenticated;

grant select, insert, update, delete
on public.timetable_batch_profiles
to authenticated;

grant select, insert, update, delete
on public.timetable_working_days
to authenticated;

grant select, insert, update, delete
on public.timetable_period_slots
to authenticated;

grant select, insert, update, delete
on public.timetable_resources
to authenticated;


create policy
"Authenticated read scheduling profiles"
on public.timetable_scheduling_profiles
for select
to authenticated
using (true);


create policy
"Main Admin manage scheduling profiles"
on public.timetable_scheduling_profiles
for all
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
)
with check (
  public.current_campus_role() =
    'Main Admin'

  and created_by =
    auth.uid()
);


create policy
"Authenticated read batch scheduling profiles"
on public.timetable_batch_profiles
for select
to authenticated
using (true);


create policy
"Main Admin manage batch scheduling profiles"
on public.timetable_batch_profiles
for all
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
)
with check (
  public.current_campus_role() =
    'Main Admin'

  and created_by =
    auth.uid()
);


create policy
"Authenticated read timetable working days"
on public.timetable_working_days
for select
to authenticated
using (true);


create policy
"Main Admin manage timetable working days"
on public.timetable_working_days
for all
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
)
with check (
  public.current_campus_role() =
    'Main Admin'
);


create policy
"Authenticated read timetable period slots"
on public.timetable_period_slots
for select
to authenticated
using (true);


create policy
"Main Admin manage timetable period slots"
on public.timetable_period_slots
for all
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
)
with check (
  public.current_campus_role() =
    'Main Admin'
);


create policy
"Authenticated read timetable resources"
on public.timetable_resources
for select
to authenticated
using (true);


create policy
"Main Admin manage timetable resources"
on public.timetable_resources
for all
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
)
with check (
  public.current_campus_role() =
    'Main Admin'

  and created_by =
    auth.uid()
);


notify pgrst, 'reload schema';
