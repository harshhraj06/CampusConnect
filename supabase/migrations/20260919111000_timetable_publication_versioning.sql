-- ============================================================
-- CAMPUSCONNECT
-- VERSIONED TIMETABLE PUBLICATION FOUNDATION
--
-- Goals:
-- 1. Preserve historical timetable entry UUIDs.
-- 2. Keep coverage/substitution history valid.
-- 3. Allow a new timetable version to coexist with old versions.
-- 4. Expose only the currently Published version to live readers.
-- 5. Keep collision validation active across CURRENT publications.
-- ============================================================


-- ------------------------------------------------------------
-- 1. PUBLICATION HEADER
-- ------------------------------------------------------------

create table if not exists
public.timetable_publications (
  id uuid primary key
    default gen_random_uuid(),

  batch_id uuid not null
    references public.attendance_batches(id)
    on delete cascade,

  version_number integer not null
    check (version_number >= 1),

  status text not null
    default 'Draft'
    check (
      status in (
        'Draft',
        'Published',
        'Superseded'
      )
    ),

  published_by uuid null
    references auth.users(id)
    on delete set null,

  published_at timestamptz null,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique (
    batch_id,
    version_number
  )
);


create unique index if not exists
timetable_publications_one_published_per_batch_idx
on public.timetable_publications (
  batch_id
)
where status = 'Published';


create index if not exists
timetable_publications_batch_status_idx
on public.timetable_publications (
  batch_id,
  status,
  version_number desc
);


-- ------------------------------------------------------------
-- 2. ENTRY -> PUBLICATION LINK
-- ------------------------------------------------------------

alter table
public.batch_timetable_entries
add column if not exists
publication_id uuid null
references public.timetable_publications(id)
on delete restrict;


create index if not exists
batch_timetable_entries_publication_idx
on public.batch_timetable_entries (
  publication_id
);


-- ------------------------------------------------------------
-- 3. BACKFILL EXISTING TIMETABLES
--
-- Each batch that already has structured timetable rows receives
-- Publication V1.
--
-- Existing timetable entry UUIDs are NOT changed.
-- ------------------------------------------------------------

do $$
declare
  batch_row record;
  publication_uuid uuid;
  owner_uuid uuid;
begin

  for batch_row in
    select distinct
      entry.batch_id
    from
      public.batch_timetable_entries entry
    where
      entry.publication_id is null
  loop

    select
      entry.created_by
    into
      owner_uuid
    from
      public.batch_timetable_entries entry
    where
      entry.batch_id =
        batch_row.batch_id
    order by
      entry.created_at asc,
      entry.id asc
    limit 1;


    select
      publication.id
    into
      publication_uuid
    from
      public.timetable_publications publication
    where
      publication.batch_id =
        batch_row.batch_id

      and publication.status =
        'Published'
    order by
      publication.version_number desc
    limit 1;


    if publication_uuid is null then

      insert into
      public.timetable_publications (
        batch_id,
        version_number,
        status,
        published_by,
        published_at,
        created_by
      )
      values (
        batch_row.batch_id,
        1,
        'Published',
        owner_uuid,
        now(),
        owner_uuid
      )
      returning id
      into publication_uuid;

    end if;


    update
      public.batch_timetable_entries entry
    set
      publication_id =
        publication_uuid
    where
      entry.batch_id =
        batch_row.batch_id

      and entry.publication_id is null;

  end loop;

end;
$$;


alter table
public.batch_timetable_entries
alter column publication_id
set not null;


-- ------------------------------------------------------------
-- 4. OLD UNIQUE INDEXES ARE NOT VERSION SAFE
--
-- Historical V1 and active V2 are allowed to contain the same
-- batch/day/period coordinates.
-- ------------------------------------------------------------

drop index if exists
public.batch_timetable_subgroup_period_unique_idx;

drop index if exists
public.batch_timetable_whole_batch_period_unique_idx;


create unique index
batch_timetable_subgroup_period_unique_idx
on public.batch_timetable_entries (
  publication_id,
  batch_id,
  day_of_week,
  period_order,
  subgroup
)
where subgroup <> '';


create unique index
batch_timetable_whole_batch_period_unique_idx
on public.batch_timetable_entries (
  publication_id,
  batch_id,
  day_of_week,
  period_order
)
where subgroup = '';


-- ------------------------------------------------------------
-- 5. VALIDATE PUBLICATION/BATCH RELATIONSHIP
-- ------------------------------------------------------------

create or replace function
public.validate_batch_timetable_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  new_publication_batch uuid;
begin

  new.subgroup :=
    upper(
      trim(
        coalesce(
          new.subgroup,
          ''
        )
      )
    );


  -- ----------------------------------------------------------
  -- Publication must belong to the same batch.
  -- ----------------------------------------------------------

  select
    publication.batch_id
  into
    new_publication_batch
  from
    public.timetable_publications publication
  where
    publication.id =
      new.publication_id;


  if new_publication_batch is null then
    raise exception
      'Timetable publication does not exist';
  end if;


  if new_publication_batch <>
    new.batch_id
  then
    raise exception
      'Timetable publication does not belong to this batch';
  end if;


  -- ----------------------------------------------------------
  -- Subject must belong to selected batch.
  -- Main Admin may assign another valid faculty.
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from
      public.attendance_batch_subjects bs
    where
      bs.id =
        new.batch_subject_id

      and bs.batch_id =
        new.batch_id

      and (
        bs.faculty_id =
          new.faculty_id

        or public.current_campus_role() =
          'Main Admin'
      )
  ) then

    raise exception
      'Selected subject does not belong to this batch/faculty';

  end if;


  -- ----------------------------------------------------------
  -- BATCH / SUBGROUP COLLISION
  --
  -- Historical versions are ignored.
  --
  -- Within the publication being created:
  --   normal collision rules apply.
  --
  -- We intentionally do not compare the new version against an
  -- older publication of the SAME batch.
  -- ----------------------------------------------------------

  if exists (
    select 1
    from
      public.batch_timetable_entries existing
    where
      existing.batch_id =
        new.batch_id

      and existing.publication_id =
        new.publication_id

      and existing.day_of_week =
        new.day_of_week

      and existing.id <>
        new.id

      and new.start_time <
        existing.end_time

      and new.end_time >
        existing.start_time

      and (
        new.subgroup = ''

        or existing.subgroup = ''

        or existing.subgroup =
          new.subgroup
      )
  ) then

    raise exception
      'This batch or subgroup already has a class during the selected time';

  end if;


  -- ----------------------------------------------------------
  -- FACULTY COLLISION
  --
  -- Compare against:
  -- 1. entries inside the SAME new publication
  -- 2. entries from OTHER batches whose publication is Published
  --
  -- Ignore historical/superseded timetable versions.
  -- ----------------------------------------------------------

  if exists (
    select 1
    from
      public.batch_timetable_entries existing

    join
      public.timetable_publications existing_publication
      on existing_publication.id =
        existing.publication_id

    where
      existing.faculty_id =
        new.faculty_id

      and existing.day_of_week =
        new.day_of_week

      and existing.id <>
        new.id

      and new.start_time <
        existing.end_time

      and new.end_time >
        existing.start_time

      and (
        existing.publication_id =
          new.publication_id

        or (
          existing.batch_id <>
            new.batch_id

          and existing_publication.status =
            'Published'
        )
      )
  ) then

    raise exception
      'Faculty already has another class during this time';

  end if;


  new.updated_at :=
    now();


  return new;

end;
$function$;


-- ------------------------------------------------------------
-- 6. VERSION-AWARE RESOURCE COLLISION
-- ------------------------------------------------------------

create or replace function
public.validate_timetable_resource_collision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
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

    join
      public.timetable_publications existing_publication
      on existing_publication.id =
        existing.publication_id

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

      and (
        existing.publication_id =
          new.publication_id

        or (
          existing.batch_id <>
            new.batch_id

          and existing_publication.status =
            'Published'
        )
      )
  ) then

    raise exception
      'Room or laboratory is already occupied during this time';

  end if;


  return new;

end;
$function$;


-- ------------------------------------------------------------
-- 7. STUDENT RPC — ONLY CURRENT PUBLISHED TIMETABLE
-- ------------------------------------------------------------

create or replace function
public.get_my_timetable()
returns table (
  id uuid,
  semester integer,
  day_of_week text,
  period_order integer,
  start_time time,
  end_time time,
  subject_code text,
  subject_name text,
  faculty_name text,
  room text,
  class_type text,
  source text
)
language sql
stable
security definer
set search_path = ''
as $function$

  select
    entry.id,

    case
      when batch.semester ~ '^[0-9]+$'
        then batch.semester::integer
      else null
    end as semester,

    entry.day_of_week,
    entry.period_order,
    entry.start_time,
    entry.end_time,

    subject.subject_code,
    subject.subject_name,

    coalesce(
      nullif(
        trim(entry.faculty_name),
        ''
      ),
      subject.faculty_name
    ) as faculty_name,

    entry.room,
    entry.class_type,

    'batch'::text
      as source

  from
    public.batch_timetable_entries entry

  join
    public.timetable_publications publication
    on publication.id =
      entry.publication_id

  join
    public.attendance_batches batch
    on batch.id =
      entry.batch_id

  join
    public.attendance_batch_subjects subject
    on subject.id =
      entry.batch_subject_id

  join
    public.attendance_batch_students membership
    on membership.batch_id =
      entry.batch_id

  where
    auth.uid() is not null

    and membership.student_id =
      auth.uid()

    and publication.status =
      'Published'


  union all


  select
    legacy.id,
    legacy.semester,
    legacy.day_of_week,
    legacy.period_order,
    legacy.start_time,
    legacy.end_time,
    legacy.subject_code,
    legacy.subject_name,
    legacy.faculty_name,
    legacy.room,
    legacy.class_type,

    'legacy'::text
      as source

  from
    public.college_timetable legacy

  where
    auth.uid() is not null

    and legacy.student_id =
      auth.uid()

    and not exists (
      select 1
      from
        public.batch_timetable_entries entry

      join
        public.timetable_publications publication
        on publication.id =
          entry.publication_id

      join
        public.attendance_batch_students membership
        on membership.batch_id =
          entry.batch_id

      join
        public.attendance_batch_subjects subject
        on subject.id =
          entry.batch_subject_id

      where
        membership.student_id =
          auth.uid()

        and publication.status =
          'Published'

        and lower(
          entry.day_of_week
        ) =
          lower(
            legacy.day_of_week
          )

        and entry.period_order =
          legacy.period_order

        and lower(
          trim(
            subject.subject_name
          )
        ) =
          lower(
            trim(
              legacy.subject_name
            )
          )
    )

  order by
    day_of_week,
    period_order,
    start_time;

$function$;


-- ------------------------------------------------------------
-- 8. LIVE TIMETABLE READER FOR FACULTY / ADMIN MODULES
--
-- RLS still applies through the caller's authenticated identity,
-- but this RPC guarantees historical versions are hidden.
-- ------------------------------------------------------------

create or replace function
public.get_current_batch_timetable_entries(
  p_batch_ids uuid[]
)
returns table (
  id uuid,
  batch_id uuid,
  batch_subject_id uuid,
  faculty_id uuid,
  faculty_name text,
  day_of_week text,
  period_order integer,
  start_time time,
  end_time time,
  room text,
  class_type text,
  subgroup text,
  resource_id uuid,
  publication_id uuid
)
language sql
stable
security definer
set search_path = ''
as $function$

  select
    entry.id,
    entry.batch_id,
    entry.batch_subject_id,
    entry.faculty_id,
    entry.faculty_name,
    entry.day_of_week,
    entry.period_order,
    entry.start_time,
    entry.end_time,
    entry.room,
    entry.class_type,
    entry.subgroup,
    entry.resource_id,
    entry.publication_id

  from
    public.batch_timetable_entries entry

  join
    public.timetable_publications publication
    on publication.id =
      entry.publication_id

  where
    auth.uid() is not null

    and entry.batch_id =
      any(
        coalesce(
          p_batch_ids,
          array[]::uuid[]
        )
      )

    and publication.status =
      'Published'

    and (
      public.current_campus_role() =
        'Main Admin'

      or exists (
        select 1
        from
          public.attendance_batch_subjects own_subject
        where
          own_subject.batch_id =
            entry.batch_id

          and own_subject.faculty_id =
            auth.uid()
      )
    )

  order by
    entry.day_of_week,
    entry.period_order,
    entry.start_time;

$function$;


revoke all
on function
public.get_current_batch_timetable_entries(uuid[])
from public;

grant execute
on function
public.get_current_batch_timetable_entries(uuid[])
to authenticated;


-- ------------------------------------------------------------
-- 9. RLS FOR PUBLICATION METADATA
-- ------------------------------------------------------------

alter table
public.timetable_publications
enable row level security;


drop policy if exists
"Authenticated reads timetable publications"
on public.timetable_publications;

create policy
"Authenticated reads timetable publications"
on public.timetable_publications
for select
to authenticated
using (
  auth.uid() is not null
);


drop policy if exists
"Main Admin manages timetable publications"
on public.timetable_publications;

create policy
"Main Admin manages timetable publications"
on public.timetable_publications
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


-- ------------------------------------------------------------
-- 10. UPDATED_AT
-- ------------------------------------------------------------

create or replace function
public.set_timetable_publication_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin

  new.updated_at :=
    now();

  return new;

end;
$function$;


drop trigger if exists
set_timetable_publication_updated_at
on public.timetable_publications;

create trigger
set_timetable_publication_updated_at
before update
on public.timetable_publications
for each row
execute function
public.set_timetable_publication_updated_at();


notify pgrst,
  'reload schema';
