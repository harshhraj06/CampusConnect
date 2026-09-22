-- ============================================================
-- CAMPUSCONNECT — FACULTY SYLLABUS FOUNDATION
--
-- Syllabus belongs to a concrete attendance_batch_subject.
--
-- Faculty access is assignment-derived:
--   1. direct attendance_batch_subjects.faculty_id
--   2. active faculty_teaching_allocations
--
-- Main Admin retains full academic oversight.
-- ============================================================


-- ============================================================
-- ASSIGNMENT AUTHORIZATION HELPER
-- ============================================================

create or replace function
public.can_access_assigned_batch_subject(
  p_batch_subject_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    case

      when auth.uid() is null
        then false

      when public.current_campus_role() =
        'Main Admin'
        then true

      when public.current_campus_role() =
        'Faculty'
        then exists (

          select 1

          from public.attendance_batch_subjects abs

          where
            abs.id =
              p_batch_subject_id

            and (

              abs.faculty_id =
                auth.uid()

              or exists (

                select 1

                from public.faculty_teaching_allocations fta

                where
                  fta.batch_subject_id =
                    abs.id

                  and fta.batch_id =
                    abs.batch_id

                  and fta.faculty_id =
                    auth.uid()

                  and lower(
                    trim(
                      coalesce(
                        fta.status,
                        ''
                      )
                    )
                  ) =
                    'active'
              )
            )
        )

      else false

    end;
$$;


revoke all
on function
public.can_access_assigned_batch_subject(uuid)
from public;


grant execute
on function
public.can_access_assigned_batch_subject(uuid)
to authenticated;



-- ============================================================
-- SYLLABUS UNITS
-- ============================================================

create table if not exists
public.faculty_syllabus_units (

  id uuid primary key
    default gen_random_uuid(),

  batch_subject_id uuid not null
    references public.attendance_batch_subjects(id)
    on delete cascade,

  unit_number integer not null
    check (
      unit_number > 0
    ),

  unit_title text not null
    check (
      char_length(
        trim(
          unit_title
        )
      ) between 1 and 180
    ),

  description text not null
    default '',

  created_by uuid not null
    references auth.users(id)
    on delete cascade,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint faculty_syllabus_units_subject_unit_key
    unique (
      batch_subject_id,
      unit_number
    )
);


create index if not exists
faculty_syllabus_units_subject_idx
on public.faculty_syllabus_units (
  batch_subject_id,
  unit_number
);



-- ============================================================
-- SYLLABUS TOPICS
-- ============================================================

create table if not exists
public.faculty_syllabus_topics (

  id uuid primary key
    default gen_random_uuid(),

  unit_id uuid not null
    references public.faculty_syllabus_units(id)
    on delete cascade,

  batch_subject_id uuid not null
    references public.attendance_batch_subjects(id)
    on delete cascade,

  topic_order integer not null
    check (
      topic_order > 0
    ),

  topic_title text not null
    check (
      char_length(
        trim(
          topic_title
        )
      ) between 1 and 240
    ),

  description text not null
    default '',

  planned_periods integer not null
    default 1
    check (
      planned_periods > 0
    ),

  created_by uuid not null
    references auth.users(id)
    on delete cascade,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint faculty_syllabus_topics_unit_order_key
    unique (
      unit_id,
      topic_order
    )
);


create index if not exists
faculty_syllabus_topics_subject_idx
on public.faculty_syllabus_topics (
  batch_subject_id
);


create index if not exists
faculty_syllabus_topics_unit_idx
on public.faculty_syllabus_topics (
  unit_id,
  topic_order
);


create unique index if not exists
faculty_syllabus_topics_subject_title_unique
on public.faculty_syllabus_topics (
  batch_subject_id,
  lower(
    trim(
      topic_title
    )
  )
);



-- ============================================================
-- AUTOMATIC DIARY → SYLLABUS COMPLETION LINK
--
-- A completion row links the exact syllabus topic with the
-- Faculty Diary entry that proved the topic was taught.
-- ============================================================

create table if not exists
public.faculty_syllabus_topic_completions (

  id uuid primary key
    default gen_random_uuid(),

  topic_id uuid not null
    references public.faculty_syllabus_topics(id)
    on delete cascade,

  batch_subject_id uuid not null
    references public.attendance_batch_subjects(id)
    on delete cascade,

  diary_id uuid not null
    references public.faculty_class_diary(id)
    on delete cascade,

  faculty_id uuid not null
    references auth.users(id)
    on delete cascade,

  completed_at timestamptz not null
    default now(),

  created_at timestamptz not null
    default now(),

  constraint faculty_syllabus_topic_completion_topic_key
    unique (
      topic_id
    ),

  constraint faculty_syllabus_topic_completion_diary_key
    unique (
      diary_id,
      topic_id
    )
);


create index if not exists
faculty_syllabus_completion_subject_idx
on public.faculty_syllabus_topic_completions (
  batch_subject_id
);


create index if not exists
faculty_syllabus_completion_faculty_idx
on public.faculty_syllabus_topic_completions (
  faculty_id,
  completed_at desc
);



-- ============================================================
-- DATA CONSISTENCY
--
-- topic.batch_subject_id must always match its parent unit.
-- ============================================================

create or replace function
public.validate_faculty_syllabus_topic_subject()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unit_subject_id uuid;
begin

  select
    u.batch_subject_id

  into
    v_unit_subject_id

  from public.faculty_syllabus_units u

  where
    u.id =
      new.unit_id;


  if
    v_unit_subject_id is null
  then
    raise exception
      'Syllabus unit does not exist.';
  end if;


  if
    new.batch_subject_id <>
      v_unit_subject_id
  then
    raise exception
      'Syllabus topic subject must match its parent unit.';
  end if;


  return new;

end;
$$;


drop trigger if exists
validate_faculty_syllabus_topic_subject_trigger
on public.faculty_syllabus_topics;


create trigger
validate_faculty_syllabus_topic_subject_trigger

before insert or update
on public.faculty_syllabus_topics

for each row
execute function
public.validate_faculty_syllabus_topic_subject();



-- ============================================================
-- AUTOMATIC EXACT TOPIC MATCHING
--
-- When Faculty Diary is inserted/updated:
--
-- Diary:
--   "Introduction to Basic Signal Processing"
--
-- matches syllabus topic:
--   "Introduction to Basic Signal Processing"
--
-- for the SAME batch_subject_id.
--
-- This creates the completion automatically.
-- ============================================================

create or replace function
public.sync_faculty_diary_to_syllabus()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_topic_id uuid;
begin

  -- Diary records without a concrete subject cannot safely
  -- update syllabus progress.

  if
    new.batch_subject_id is null
    or trim(
      coalesce(
        new.topic,
        ''
      )
    ) = ''
  then
    return new;
  end if;


  select
    t.id

  into
    v_topic_id

  from public.faculty_syllabus_topics t

  where
    t.batch_subject_id =
      new.batch_subject_id

    and lower(
      trim(
        t.topic_title
      )
    ) =
      lower(
        trim(
          new.topic
        )
      )

  limit 1;


  if
    v_topic_id is null
  then
    return new;
  end if;


  insert into
    public.faculty_syllabus_topic_completions (
      topic_id,
      batch_subject_id,
      diary_id,
      faculty_id,
      completed_at
    )

  values (
    v_topic_id,
    new.batch_subject_id,
    new.id,
    new.faculty_id,
    new.class_date::timestamptz
  )

  on conflict (
    topic_id
  )
  do update
  set
    diary_id =
      excluded.diary_id,

    faculty_id =
      excluded.faculty_id,

    completed_at =
      excluded.completed_at;


  return new;

end;
$$;


drop trigger if exists
sync_faculty_diary_to_syllabus_trigger
on public.faculty_class_diary;


create trigger
sync_faculty_diary_to_syllabus_trigger

after insert or update of
  topic,
  batch_subject_id

on public.faculty_class_diary

for each row
execute function
public.sync_faculty_diary_to_syllabus();



-- ============================================================
-- RLS
-- ============================================================

alter table
public.faculty_syllabus_units
enable row level security;


alter table
public.faculty_syllabus_topics
enable row level security;


alter table
public.faculty_syllabus_topic_completions
enable row level security;



-- ============================================================
-- UNITS POLICIES
-- ============================================================

drop policy if exists
"Faculty reads assigned syllabus units"
on public.faculty_syllabus_units;


create policy
"Faculty reads assigned syllabus units"
on public.faculty_syllabus_units
for select
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


drop policy if exists
"Faculty creates assigned syllabus units"
on public.faculty_syllabus_units;


create policy
"Faculty creates assigned syllabus units"
on public.faculty_syllabus_units
for insert
to authenticated
with check (
  created_by =
    auth.uid()

  and public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


drop policy if exists
"Faculty updates assigned syllabus units"
on public.faculty_syllabus_units;


create policy
"Faculty updates assigned syllabus units"
on public.faculty_syllabus_units
for update
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
)
with check (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


drop policy if exists
"Faculty deletes assigned syllabus units"
on public.faculty_syllabus_units;


create policy
"Faculty deletes assigned syllabus units"
on public.faculty_syllabus_units
for delete
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);



-- ============================================================
-- TOPICS POLICIES
-- ============================================================

drop policy if exists
"Faculty reads assigned syllabus topics"
on public.faculty_syllabus_topics;


create policy
"Faculty reads assigned syllabus topics"
on public.faculty_syllabus_topics
for select
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


drop policy if exists
"Faculty creates assigned syllabus topics"
on public.faculty_syllabus_topics;


create policy
"Faculty creates assigned syllabus topics"
on public.faculty_syllabus_topics
for insert
to authenticated
with check (
  created_by =
    auth.uid()

  and public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


drop policy if exists
"Faculty updates assigned syllabus topics"
on public.faculty_syllabus_topics;


create policy
"Faculty updates assigned syllabus topics"
on public.faculty_syllabus_topics
for update
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
)
with check (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


drop policy if exists
"Faculty deletes assigned syllabus topics"
on public.faculty_syllabus_topics;


create policy
"Faculty deletes assigned syllabus topics"
on public.faculty_syllabus_topics
for delete
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);



-- ============================================================
-- COMPLETION POLICIES
-- ============================================================

drop policy if exists
"Faculty reads assigned syllabus completions"
on public.faculty_syllabus_topic_completions;


create policy
"Faculty reads assigned syllabus completions"
on public.faculty_syllabus_topic_completions
for select
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


-- Completion writes are performed by the trusted diary trigger.
-- Faculty does not need direct INSERT/UPDATE/DELETE permissions.



-- ============================================================
-- TABLE GRANTS
-- ============================================================

revoke all
on table public.faculty_syllabus_units
from anon;


revoke all
on table public.faculty_syllabus_topics
from anon;


revoke all
on table public.faculty_syllabus_topic_completions
from anon;


grant
select,
insert,
update,
delete
on table public.faculty_syllabus_units
to authenticated;


grant
select,
insert,
update,
delete
on table public.faculty_syllabus_topics
to authenticated;


grant
select
on table public.faculty_syllabus_topic_completions
to authenticated;
