-- ============================================================
-- CAMPUSCONNECT
-- TIMETABLE PERIOD SLOT — CHRONOLOGICAL ORDERING
--
-- period_order is the chronological scheduling coordinate.
--
-- Guarantees:
--   - slot UUIDs never change during reorder
--   - faculty availability references remain intact
--   - add/edit automatically reorders by actual time
--   - duplicate period_order values cannot survive commit
--   - only Main Admin can mutate period structure
--   - existing ECE profiles are normalized in place
-- ============================================================


-- ------------------------------------------------------------
-- 1. Make the existing unique constraint deferrable.
--
-- This lets one transaction safely transform:
--
--   1, 4, 3, 5
--
-- into:
--
--   1, 2, 3, 4
--
-- without temporary duplicate-key failures.
-- ------------------------------------------------------------

alter table
  public.timetable_period_slots
drop constraint
  timetable_period_slots_profile_id_period_order_key;


alter table
  public.timetable_period_slots
add constraint
  timetable_period_slots_profile_id_period_order_key
unique (
  profile_id,
  period_order
)
deferrable initially immediate;


-- ------------------------------------------------------------
-- 2. Atomic save + chronological normalization.
-- ------------------------------------------------------------

create or replace function
public.save_timetable_period_slot(
  p_profile_id uuid,
  p_slot_id uuid,
  p_label text,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_is_teaching_slot boolean
)
returns table (
  id uuid,
  profile_id uuid,
  period_order integer,
  label text,
  start_time time without time zone,
  end_time time without time zone,
  is_teaching_slot boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_slot_id uuid;
  slot_count integer;
begin

  -- Authentication is mandatory.
  if auth.uid() is null then
    raise exception
      'Authentication required';
  end if;


  -- Current authorization model intentionally remains
  -- Main Admin only until secure HOD identity mapping is added.
  if coalesce(
    public.current_campus_role(),
    ''
  ) <> 'Main Admin' then

    raise exception
      'Only Main Admin can manage timetable period slots';

  end if;


  -- Scheduling profile must exist.
  if not exists (
    select 1
    from
      public.timetable_scheduling_profiles profile
    where
      profile.id =
        p_profile_id
  ) then

    raise exception
      'Scheduling profile does not exist';

  end if;


  -- Defensive validation.
  if nullif(
    trim(
      coalesce(
        p_label,
        ''
      )
    ),
    ''
  ) is null then

    raise exception
      'Period label is required';

  end if;


  if
    p_start_time is null
    or p_end_time is null
    or p_end_time <= p_start_time
  then

    raise exception
      'Period end time must be after start time';

  end if;


  /*
   * Serialize structural edits for this profile.
   *
   * This prevents two administrators from changing the same
   * period structure concurrently.
   */
  perform
    slot.id
  from
    public.timetable_period_slots slot
  where
    slot.profile_id =
      p_profile_id
  for update;


  /*
   * Delay the profile/order uniqueness check until the
   * transaction finishes normalization.
   */
  set constraints
    timetable_period_slots_profile_id_period_order_key
  deferred;


  if p_slot_id is null then

    select
      count(*)
    into
      slot_count
    from
      public.timetable_period_slots slot
    where
      slot.profile_id =
        p_profile_id;


    if slot_count >= 20 then
      raise exception
        'A scheduling profile can contain at most 20 period slots';
    end if;


    /*
     * period_order = 1 is intentionally temporary.
     *
     * Because the unique constraint is deferred, the row can
     * safely exist until the chronological normalization below
     * assigns the final unique order.
     */
    insert into
      public.timetable_period_slots (
        profile_id,
        period_order,
        label,
        start_time,
        end_time,
        is_teaching_slot
      )
    values (
      p_profile_id,
      1,
      trim(p_label),
      p_start_time,
      p_end_time,
      coalesce(
        p_is_teaching_slot,
        true
      )
    )
    returning
      timetable_period_slots.id
    into
      saved_slot_id;

  else

    update
      public.timetable_period_slots slot
    set
      label =
        trim(p_label),

      start_time =
        p_start_time,

      end_time =
        p_end_time,

      is_teaching_slot =
        coalesce(
          p_is_teaching_slot,
          true
        )

    where
      slot.id =
        p_slot_id

      and slot.profile_id =
        p_profile_id

    returning
      slot.id
    into
      saved_slot_id;


    if saved_slot_id is null then
      raise exception
        'Period slot does not exist in this scheduling profile';
    end if;

  end if;


  /*
   * Actual time is the source of chronological truth.
   *
   * UUID is used only as a deterministic final tie-breaker.
   * Exact duplicate time ranges are already rejected by the
   * table constraint / validator.
   */
  with ranked as (
    select
      slot.id,

      row_number() over (
        order by
          slot.start_time,
          slot.end_time,
          slot.id
      )::integer
        as chronological_order

    from
      public.timetable_period_slots slot

    where
      slot.profile_id =
        p_profile_id
  )

  update
    public.timetable_period_slots slot

  set
    period_order =
      ranked.chronological_order

  from
    ranked

  where
    slot.id =
      ranked.id;


  return query

  select
    slot.id,
    slot.profile_id,
    slot.period_order,
    slot.label,
    slot.start_time,
    slot.end_time,
    slot.is_teaching_slot

  from
    public.timetable_period_slots slot

  where
    slot.id =
      saved_slot_id;

end;
$$;


-- ------------------------------------------------------------
-- 3. Safe delete + chronological normalization.
-- ------------------------------------------------------------

create or replace function
public.delete_timetable_period_slot(
  p_slot_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile_id uuid;
begin

  if auth.uid() is null then
    raise exception
      'Authentication required';
  end if;


  if coalesce(
    public.current_campus_role(),
    ''
  ) <> 'Main Admin' then

    raise exception
      'Only Main Admin can manage timetable period slots';

  end if;


  select
    slot.profile_id
  into
    target_profile_id

  from
    public.timetable_period_slots slot

  where
    slot.id =
      p_slot_id

  for update;


  if target_profile_id is null then
    raise exception
      'Period slot does not exist';
  end if;


  /*
   * Do not silently CASCADE-delete faculty availability.
   *
   * Existing FK behavior is CASCADE, so this explicit guard
   * prevents accidental loss of faculty scheduling choices.
   */
  if exists (
    select 1
    from
      public.faculty_recurring_availability availability
    where
      availability.period_slot_id =
        p_slot_id
  ) then

    raise exception
      'This period has faculty recurring availability. Remove or move those availability records before deleting the period';

  end if;


  if exists (
    select 1
    from
      public.faculty_unavailability unavailable
    where
      unavailable.period_slot_id =
        p_slot_id
  ) then

    raise exception
      'This period has faculty unavailability records. Remove or move those records before deleting the period';

  end if;


  /*
   * Lock remaining slots belonging to this scheduling profile.
   */
  perform
    slot.id

  from
    public.timetable_period_slots slot

  where
    slot.profile_id =
      target_profile_id

  for update;


  set constraints
    timetable_period_slots_profile_id_period_order_key
  deferred;


  delete from
    public.timetable_period_slots slot

  where
    slot.id =
      p_slot_id;


  with ranked as (
    select
      slot.id,

      row_number() over (
        order by
          slot.start_time,
          slot.end_time,
          slot.id
      )::integer
        as chronological_order

    from
      public.timetable_period_slots slot

    where
      slot.profile_id =
        target_profile_id
  )

  update
    public.timetable_period_slots slot

  set
    period_order =
      ranked.chronological_order

  from
    ranked

  where
    slot.id =
      ranked.id;

end;
$$;


-- ------------------------------------------------------------
-- 4. Permissions.
-- ------------------------------------------------------------

revoke all
on function
  public.save_timetable_period_slot(
    uuid,
    uuid,
    text,
    time without time zone,
    time without time zone,
    boolean
  )
from
  public,
  anon;


grant execute
on function
  public.save_timetable_period_slot(
    uuid,
    uuid,
    text,
    time without time zone,
    time without time zone,
    boolean
  )
to
  authenticated;


revoke all
on function
  public.delete_timetable_period_slot(uuid)
from
  public,
  anon;


grant execute
on function
  public.delete_timetable_period_slot(uuid)
to
  authenticated;


comment on function
public.save_timetable_period_slot(
  uuid,
  uuid,
  text,
  time without time zone,
  time without time zone,
  boolean
)
is
'Creates or updates a timetable period slot and atomically normalizes period_order by chronological start/end time. Slot UUIDs are preserved. Main Admin only.';


comment on function
public.delete_timetable_period_slot(uuid)
is
'Deletes an unreferenced timetable period slot and atomically normalizes remaining chronological period_order values. Main Admin only.';


-- ------------------------------------------------------------
-- 5. Repair existing ECE scheduling profiles in place.
--
-- No row is deleted.
-- No UUID changes.
-- Availability references therefore remain attached.
-- ------------------------------------------------------------

set constraints
  timetable_period_slots_profile_id_period_order_key
deferred;


with ranked as (
  select
    slot.id,

    row_number() over (
      partition by
        slot.profile_id

      order by
        slot.start_time,
        slot.end_time,
        slot.id
    )::integer
      as chronological_order

  from
    public.timetable_period_slots slot

  join
    public.timetable_scheduling_profiles profile
      on profile.id =
        slot.profile_id

  where
    upper(
      trim(
        profile.department
      )
    ) = 'ECE'
)

update
  public.timetable_period_slots slot

set
  period_order =
    ranked.chronological_order

from
  ranked

where
  slot.id =
    ranked.id;


notify pgrst,
  'reload schema';
