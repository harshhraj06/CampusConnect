-- ============================================================
-- CAMPUSCONNECT — TIMETABLE SUBGROUP FOUNDATION
--
-- Enables parallel ECE lab/tutorial groups such as A1/A2/A3.
--
-- Rules:
--   subgroup = ''  -> whole batch / whole section
--   subgroup = A1  -> subgroup-specific class
--
-- A whole-batch class conflicts with every subgroup.
-- Different non-empty subgroups may run in parallel.
-- The same subgroup may not occupy overlapping classes.
--
-- Existing timetable rows remain whole-batch rows because the
-- new column defaults to ''.
-- ============================================================


-- ============================================================
-- 1. ADD SUBGROUP
-- ============================================================

alter table
public.batch_timetable_entries
add column if not exists
subgroup text not null
default '';


-- Normalise existing values before installing validation.

update
public.batch_timetable_entries
set subgroup =
  upper(trim(subgroup))
where subgroup <>
  upper(trim(subgroup));


-- ============================================================
-- 2. REPLACE OLD PERIOD UNIQUENESS
-- ============================================================

drop index if exists
public.batch_timetable_period_unique_idx;


-- Whole-batch rows remain unique for a logical period.

create unique index if not exists
batch_timetable_whole_batch_period_unique_idx
on public.batch_timetable_entries(
  batch_id,
  day_of_week,
  period_order
)
where subgroup = '';


-- A subgroup may have only one class in a logical period.

create unique index if not exists
batch_timetable_subgroup_period_unique_idx
on public.batch_timetable_entries(
  batch_id,
  day_of_week,
  period_order,
  subgroup
)
where subgroup <> '';


create index if not exists
batch_timetable_subgroup_idx
on public.batch_timetable_entries(
  batch_id,
  subgroup,
  day_of_week,
  period_order
);


-- ============================================================
-- 3. SUBGROUP-AWARE TIMETABLE VALIDATION
-- ============================================================

create or replace function
public.validate_batch_timetable_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  -- ----------------------------------------------------------
  -- Normalise subgroup.
  -- ----------------------------------------------------------

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
  -- Subject must belong to the selected batch.
  --
  -- Existing behaviour is retained:
  -- the configured subject faculty must match unless the
  -- authenticated user is Main Admin.
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
  -- Whole-batch class:
  --   conflicts with any overlapping class in the batch.
  --
  -- Subgroup class:
  --   conflicts with a whole-batch class or the same subgroup.
  --
  -- Different non-empty subgroups may therefore operate
  -- simultaneously.
  -- ----------------------------------------------------------

  if exists (
    select 1
    from
      public.batch_timetable_entries existing
    where
      existing.batch_id =
        new.batch_id

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
  -- Faculty cannot teach two classes simultaneously even when
  -- those classes belong to different batches/subgroups.
  -- ----------------------------------------------------------

  if exists (
    select 1
    from
      public.batch_timetable_entries existing
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
  ) then

    raise exception
      'Faculty already has another class during this time';

  end if;


  new.updated_at :=
    now();


  return new;
end;
$$;


-- Recreate trigger explicitly so the deployed definition is
-- deterministic.

drop trigger if exists
validate_batch_timetable_entry_trigger
on public.batch_timetable_entries;


create trigger
validate_batch_timetable_entry_trigger
before insert or update
on public.batch_timetable_entries
for each row
execute function
public.validate_batch_timetable_entry();


-- ============================================================
-- 4. DOCUMENT COLUMN
-- ============================================================

comment on column
public.batch_timetable_entries.subgroup
is
'Empty string means whole batch. Non-empty values such as A1, A2 or A3 identify parallel timetable subgroups.';


notify pgrst, 'reload schema';
