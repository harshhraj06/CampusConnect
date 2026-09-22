-- ============================================================
-- CAMPUSCONNECT — FACULTY COVERAGE FOUNDATION
--
-- Date-specific substitute-class workflow.
--
-- IMPORTANT:
--   Permanent batch_timetable_entries are never modified for
--   one-off faculty absence / substitution.
--
-- Flow:
--   timetable entry
--       -> coverage request
--       -> candidate offers
--       -> accepted temporary override
--
-- Current authorization:
--   Faculty: own requests / own offers
--   Main Admin: management visibility
--
-- HOD authorization is intentionally deferred until the
-- campus_faculty -> authenticated user mapping is secure.
-- ============================================================


-- ============================================================
-- 1. COVERAGE REQUESTS
-- ============================================================

create table if not exists
public.faculty_coverage_requests (
  id uuid primary key
    default gen_random_uuid(),

  timetable_entry_id uuid not null
    references public.batch_timetable_entries(id)
    on delete restrict,

  class_date date not null,

  original_faculty_id uuid not null
    references auth.users(id)
    on delete restrict,

  reason text not null
    default '',

  status text not null
    default 'Open'
    check (
      status in (
        'Open',
        'Offered',
        'Covered',
        'Uncovered',
        'Cancelled'
      )
    ),

  requested_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique (
    timetable_entry_id,
    class_date
  )
);


create index if not exists
faculty_coverage_requests_faculty_idx
on public.faculty_coverage_requests(
  original_faculty_id,
  class_date,
  status
);


create index if not exists
faculty_coverage_requests_date_idx
on public.faculty_coverage_requests(
  class_date,
  status
);


-- ============================================================
-- 2. COVERAGE OFFERS
-- ============================================================

create table if not exists
public.faculty_coverage_offers (
  id uuid primary key
    default gen_random_uuid(),

  coverage_request_id uuid not null
    references public.faculty_coverage_requests(id)
    on delete cascade,

  candidate_faculty_id uuid not null
    references auth.users(id)
    on delete restrict,

  candidate_faculty_name text not null
    default '',

  match_score numeric(7,2) not null
    default 0,

  match_reason text not null
    default '',

  status text not null
    default 'Pending'
    check (
      status in (
        'Pending',
        'Accepted',
        'Declined',
        'Expired',
        'Withdrawn'
      )
    ),

  responded_at timestamptz,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique (
    coverage_request_id,
    candidate_faculty_id
  )
);


create index if not exists
faculty_coverage_offers_candidate_idx
on public.faculty_coverage_offers(
  candidate_faculty_id,
  status,
  created_at
);


create index if not exists
faculty_coverage_offers_request_idx
on public.faculty_coverage_offers(
  coverage_request_id,
  status
);


-- ============================================================
-- 3. TEMPORARY SUBSTITUTION OVERRIDES
-- ============================================================

create table if not exists
public.faculty_substitution_overrides (
  id uuid primary key
    default gen_random_uuid(),

  coverage_request_id uuid not null
    unique
    references public.faculty_coverage_requests(id)
    on delete restrict,

  timetable_entry_id uuid not null
    references public.batch_timetable_entries(id)
    on delete restrict,

  class_date date not null,

  original_faculty_id uuid not null
    references auth.users(id)
    on delete restrict,

  substitute_faculty_id uuid not null
    references auth.users(id)
    on delete restrict,

  substitute_faculty_name text not null
    default '',

  status text not null
    default 'Active'
    check (
      status in (
        'Active',
        'Cancelled',
        'Completed'
      )
    ),

  accepted_offer_id uuid
    references public.faculty_coverage_offers(id)
    on delete restrict,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  check (
    original_faculty_id <>
      substitute_faculty_id
  ),

  unique (
    timetable_entry_id,
    class_date
  )
);


create index if not exists
faculty_substitution_overrides_substitute_idx
on public.faculty_substitution_overrides(
  substitute_faculty_id,
  class_date,
  status
);


create index if not exists
faculty_substitution_overrides_date_idx
on public.faculty_substitution_overrides(
  class_date,
  status
);


-- ============================================================
-- 4. REQUEST VALIDATION
-- ============================================================

create or replace function
public.validate_faculty_coverage_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  timetable_faculty uuid;
  timetable_day text;
  expected_day text;
begin

  select
    entry.faculty_id,
    entry.day_of_week
  into
    timetable_faculty,
    timetable_day
  from
    public.batch_timetable_entries entry
  where
    entry.id =
      new.timetable_entry_id;


  if timetable_faculty is null then
    raise exception
      'Selected timetable entry does not exist';
  end if;


  if timetable_faculty <>
    new.original_faculty_id
  then
    raise exception
      'Coverage request faculty does not match timetable faculty';
  end if;


  expected_day :=
    trim(
      to_char(
        new.class_date,
        'FMDay'
      )
    );


  if expected_day <>
    timetable_day
  then
    raise exception
      'Coverage date does not match the timetable day';
  end if;


  if new.class_date <
    current_date
  then
    raise exception
      'Coverage cannot be requested for a past class';
  end if;


  if tg_op = 'INSERT' then

    if new.requested_by <>
      new.original_faculty_id

      and public.current_campus_role() <>
        'Main Admin'
    then

      raise exception
        'Only the scheduled faculty or Main Admin can create this coverage request';

    end if;

  end if;


  new.reason :=
    trim(new.reason);

  new.updated_at :=
    now();


  return new;
end;
$$;


drop trigger if exists
validate_faculty_coverage_request_trigger
on public.faculty_coverage_requests;


create trigger
validate_faculty_coverage_request_trigger
before insert or update
on public.faculty_coverage_requests
for each row
execute function
public.validate_faculty_coverage_request();


-- ============================================================
-- 5. OFFER VALIDATION
-- ============================================================

create or replace function
public.validate_faculty_coverage_offer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  original_faculty uuid;
begin

  select
    request.original_faculty_id
  into
    original_faculty
  from
    public.faculty_coverage_requests request
  where
    request.id =
      new.coverage_request_id;


  if original_faculty is null then
    raise exception
      'Coverage request does not exist';
  end if;


  if original_faculty =
    new.candidate_faculty_id
  then
    raise exception
      'Original faculty cannot be their own substitute';
  end if;


  new.candidate_faculty_name :=
    coalesce(
      nullif(
        trim(
          (
            select profile.full_name
            from public.profiles profile
            where
              profile.id =
                new.candidate_faculty_id
            limit 1
          )
        ),
        ''
      ),
      nullif(
        trim(
          new.candidate_faculty_name
        ),
        ''
      ),
      'Faculty'
    );


  new.match_reason :=
    trim(new.match_reason);

  new.updated_at :=
    now();


  return new;
end;
$$;


drop trigger if exists
validate_faculty_coverage_offer_trigger
on public.faculty_coverage_offers;


create trigger
validate_faculty_coverage_offer_trigger
before insert or update
on public.faculty_coverage_offers
for each row
execute function
public.validate_faculty_coverage_offer();


-- ============================================================
-- 6. OVERRIDE VALIDATION
-- ============================================================

create or replace function
public.validate_faculty_substitution_override()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_entry uuid;
  request_date date;
  request_faculty uuid;

  entry_day text;
  entry_start time;
  entry_end time;

  expected_day text;
begin

  select
    request.timetable_entry_id,
    request.class_date,
    request.original_faculty_id
  into
    request_entry,
    request_date,
    request_faculty
  from
    public.faculty_coverage_requests request
  where
    request.id =
      new.coverage_request_id;


  if request_entry is null then
    raise exception
      'Coverage request does not exist';
  end if;


  if request_entry <>
      new.timetable_entry_id
    or request_date <>
      new.class_date
    or request_faculty <>
      new.original_faculty_id
  then

    raise exception
      'Substitution override does not match coverage request';

  end if;


  select
    entry.day_of_week,
    entry.start_time,
    entry.end_time
  into
    entry_day,
    entry_start,
    entry_end
  from
    public.batch_timetable_entries entry
  where
    entry.id =
      new.timetable_entry_id;


  expected_day :=
    trim(
      to_char(
        new.class_date,
        'FMDay'
      )
    );


  if expected_day <>
    entry_day
  then
    raise exception
      'Substitution date does not match timetable day';
  end if;


  if exists (
    select 1
    from
      public.batch_timetable_entries busy
    where
      busy.faculty_id =
        new.substitute_faculty_id

      and busy.day_of_week =
        entry_day

      and busy.id <>
        new.timetable_entry_id

      and entry_start <
        busy.end_time

      and entry_end >
        busy.start_time
  ) then

    raise exception
      'Substitute faculty has a permanent timetable collision';

  end if;


  if exists (
    select 1
    from
      public.faculty_substitution_overrides existing_override
    join
      public.batch_timetable_entries existing_entry
      on existing_entry.id =
        existing_override.timetable_entry_id
    where
      existing_override.substitute_faculty_id =
        new.substitute_faculty_id

      and existing_override.class_date =
        new.class_date

      and existing_override.status =
        'Active'

      and existing_override.id <>
        new.id

      and entry_start <
        existing_entry.end_time

      and entry_end >
        existing_entry.start_time
  ) then

    raise exception
      'Substitute faculty already has another substitution during this time';

  end if;


  if exists (
    select 1
    from
      public.faculty_unavailability unavailable
    where
      unavailable.faculty_id =
        new.substitute_faculty_id

      and unavailable.unavailable_date =
        new.class_date

      and unavailable.status =
        'Active'

      and (
        unavailable.period_slot_id is null

        or exists (
          select 1
          from
            public.timetable_period_slots slot
          where
            slot.id =
              unavailable.period_slot_id

            and entry_start <
              slot.end_time

            and entry_end >
              slot.start_time
        )
      )
  ) then

    raise exception
      'Substitute faculty is unavailable for this class';

  end if;


  new.substitute_faculty_name :=
    coalesce(
      nullif(
        trim(
          (
            select profile.full_name
            from public.profiles profile
            where
              profile.id =
                new.substitute_faculty_id
            limit 1
          )
        ),
        ''
      ),
      nullif(
        trim(
          new.substitute_faculty_name
        ),
        ''
      ),
      'Faculty'
    );


  new.updated_at :=
    now();


  return new;
end;
$$;


drop trigger if exists
validate_faculty_substitution_override_trigger
on public.faculty_substitution_overrides;


create trigger
validate_faculty_substitution_override_trigger
before insert or update
on public.faculty_substitution_overrides
for each row
execute function
public.validate_faculty_substitution_override();


-- ============================================================
-- 7. RLS
-- ============================================================

alter table
public.faculty_coverage_requests
enable row level security;

alter table
public.faculty_coverage_offers
enable row level security;

alter table
public.faculty_substitution_overrides
enable row level security;


grant select, insert, update, delete
on public.faculty_coverage_requests
to authenticated;

grant select, insert, update, delete
on public.faculty_coverage_offers
to authenticated;

grant select, insert, update, delete
on public.faculty_substitution_overrides
to authenticated;


-- ============================================================
-- REQUEST POLICIES
-- ============================================================

drop policy if exists
"Faculty read own coverage requests"
on public.faculty_coverage_requests;


create policy
"Faculty read own coverage requests"
on public.faculty_coverage_requests
for select
to authenticated
using (
  original_faculty_id =
    (select auth.uid())

  or public.current_campus_role() =
    'Main Admin'
);


drop policy if exists
"Faculty create own coverage requests"
on public.faculty_coverage_requests;


create policy
"Faculty create own coverage requests"
on public.faculty_coverage_requests
for insert
to authenticated
with check (
  (
    public.current_campus_role() =
      'Faculty'

    and original_faculty_id =
      (select auth.uid())

    and requested_by =
      (select auth.uid())
  )

  or (
    public.current_campus_role() =
      'Main Admin'

    and requested_by =
      (select auth.uid())
  )
);


drop policy if exists
"Faculty cancel own coverage requests"
on public.faculty_coverage_requests;


create policy
"Faculty cancel own coverage requests"
on public.faculty_coverage_requests
for update
to authenticated
using (
  original_faculty_id =
    (select auth.uid())

  or public.current_campus_role() =
    'Main Admin'
)
with check (
  original_faculty_id =
    (select auth.uid())

  or public.current_campus_role() =
    'Main Admin'
);


-- ============================================================
-- OFFER POLICIES
-- ============================================================

drop policy if exists
"Faculty read own coverage offers"
on public.faculty_coverage_offers;


create policy
"Faculty read own coverage offers"
on public.faculty_coverage_offers
for select
to authenticated
using (
  candidate_faculty_id =
    (select auth.uid())

  or public.current_campus_role() =
    'Main Admin'

  or exists (
    select 1
    from
      public.faculty_coverage_requests request
    where
      request.id =
        faculty_coverage_offers.coverage_request_id

      and request.original_faculty_id =
        (select auth.uid())
  )
);


drop policy if exists
"Faculty respond to own coverage offers"
on public.faculty_coverage_offers;


create policy
"Faculty respond to own coverage offers"
on public.faculty_coverage_offers
for update
to authenticated
using (
  candidate_faculty_id =
    (select auth.uid())

  or public.current_campus_role() =
    'Main Admin'
)
with check (
  candidate_faculty_id =
    (select auth.uid())

  or public.current_campus_role() =
    'Main Admin'
);


drop policy if exists
"Main Admin creates coverage offers"
on public.faculty_coverage_offers;


create policy
"Main Admin creates coverage offers"
on public.faculty_coverage_offers
for insert
to authenticated
with check (
  public.current_campus_role() =
    'Main Admin'
);


-- ============================================================
-- OVERRIDE POLICIES
--
-- Overrides are created by the controlled acceptance workflow
-- added in the next migration/RPC phase.
--
-- Direct authenticated INSERT/UPDATE/DELETE is intentionally
-- not exposed here.
-- ============================================================

drop policy if exists
"Faculty read relevant substitutions"
on public.faculty_substitution_overrides;


create policy
"Faculty read relevant substitutions"
on public.faculty_substitution_overrides
for select
to authenticated
using (
  original_faculty_id =
    (select auth.uid())

  or substitute_faculty_id =
    (select auth.uid())

  or public.current_campus_role() =
    'Main Admin'
);


-- ============================================================
-- 8. COMMENTS
-- ============================================================

comment on table
public.faculty_coverage_requests
is
'Date-specific request for another faculty member to cover an existing permanent timetable entry.';


comment on table
public.faculty_coverage_offers
is
'Candidate substitute offers for a faculty coverage request.';


comment on table
public.faculty_substitution_overrides
is
'Accepted date-specific faculty substitutions. Permanent timetable entries remain unchanged.';


notify pgrst, 'reload schema';
