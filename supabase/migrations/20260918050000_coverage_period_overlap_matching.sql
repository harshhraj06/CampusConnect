-- ============================================================
-- CAMPUSCONNECT — COVERAGE PERIOD OVERLAP MATCHING
--
-- Coverage must map a permanent timetable entry to the
-- configured teaching slot with the greatest time overlap.
--
-- This avoids incorrect candidate rejection when imported
-- timetable times differ slightly from scheduling-profile times.
--
-- Permanent timetable data is NOT modified.
-- Faculty availability data is NOT modified.
-- ============================================================

-- ============================================================
-- CAMPUSCONNECT
-- FACULTY COVERAGE — CANDIDATE ID AMBIGUITY FIX
--
-- Root cause:
-- generate_faculty_coverage_offers() RETURNS TABLE exposes
-- candidate_faculty_id as a PL/pgSQL output variable.
--
-- The previous ON CONFLICT column target also referenced
-- candidate_faculty_id unqualified, making PostgreSQL unable
-- to distinguish the output variable from the table column.
--
-- Fix:
-- Use the existing unique constraint directly.
-- No coverage data or timetable data is modified.
-- ============================================================

create or replace function
public.generate_faculty_coverage_offers(
  p_coverage_request_id uuid
)
returns table (
  offer_id uuid,
  candidate_faculty_id uuid,
  candidate_faculty_name text,
  match_score numeric,
  match_reason text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  caller_id uuid;
  caller_role text;

  request_row
    public.faculty_coverage_requests%rowtype;

  entry_row
    public.batch_timetable_entries%rowtype;

  target_batch
    public.attendance_batches%rowtype;

  scheduling_profile_id uuid;
  target_slot_id uuid;
begin

  caller_id := auth.uid();

  if caller_id is null then
    raise exception
      'Authentication required';
  end if;


  caller_role :=
    public.current_campus_role();


  select *
  into request_row
  from
    public.faculty_coverage_requests
  where
    id = p_coverage_request_id
  for update;


  if not found then
    raise exception
      'Coverage request does not exist';
  end if;


  if caller_role <> 'Main Admin'
     and request_row.original_faculty_id <> caller_id
  then
    raise exception
      'You do not have permission to generate offers for this request';
  end if;


  -- Uncovered is explicitly allowed so the Faculty UI's
  -- "Refresh candidate matches" action can retry safely.
  if request_row.status not in (
    'Open',
    'Offered',
    'Uncovered'
  ) then
    raise exception
      'Coverage offers cannot be generated for this request';
  end if;


  if request_row.class_date < current_date then
    raise exception
      'Coverage offers cannot be generated for a past class';
  end if;


  select *
  into entry_row
  from
    public.batch_timetable_entries
  where
    id = request_row.timetable_entry_id;


  if not found then
    raise exception
      'Timetable entry no longer exists';
  end if;


  if entry_row.faculty_id <>
    request_row.original_faculty_id
  then
    raise exception
      'Coverage request no longer matches the permanent timetable';
  end if;


  select *
  into target_batch
  from
    public.attendance_batches
  where
    id = entry_row.batch_id;


  if not found then
    raise exception
      'The timetable batch no longer exists';
  end if;


  select
    mapping.profile_id
  into
    scheduling_profile_id
  from
    public.timetable_batch_profiles mapping
  where
    mapping.batch_id = entry_row.batch_id
  limit 1;


  if scheduling_profile_id is null then
    raise exception
      'The timetable batch does not have a scheduling profile';
  end if;


  select
    slot.id
  into
    target_slot_id
  from
    public.timetable_period_slots slot
  where
    slot.profile_id =
      scheduling_profile_id

    and slot.is_teaching_slot =
      true

    and entry_row.start_time <
      slot.end_time

    and entry_row.end_time >
      slot.start_time

  order by
    (
      least(
        entry_row.end_time,
        slot.end_time
      )
      -
      greatest(
        entry_row.start_time,
        slot.start_time
      )
    ) desc,

    slot.period_order

  limit 1;


  if target_slot_id is null then
    raise exception
      'The class does not match a configured teaching period';
  end if;


  -- Pending offers are stale after a regeneration.
  update
    public.faculty_coverage_offers
  set
    status = 'Withdrawn',
    updated_at = now()
  where
    coverage_request_id =
      request_row.id

    and status = 'Pending';


  return query

  with eligible as (
    select distinct
      availability.faculty_id,

      coalesce(
        nullif(
          trim(profile.full_name),
          ''
        ),
        'Faculty'
      ) as faculty_name,


      (
        case
          when exists (
            select 1
            from
              public.faculty_teaching_allocations allocation
            where
              allocation.faculty_id =
                availability.faculty_id

              and allocation.batch_subject_id =
                entry_row.batch_subject_id

              and allocation.status =
                'Active'
          )
          then 40
          else 0
        end

        +

        case
          when exists (
            select 1
            from
              public.faculty_teaching_allocations allocation
            where
              allocation.faculty_id =
                availability.faculty_id

              and allocation.batch_id =
                entry_row.batch_id

              and allocation.status =
                'Active'
          )
          then 25
          else 0
        end

        +

        20
      )::numeric
      as score,


      concat_ws(
        ' · ',

        'Available for this period',

        case
          when exists (
            select 1
            from
              public.faculty_teaching_allocations allocation
            where
              allocation.faculty_id =
                availability.faculty_id

              and allocation.batch_subject_id =
                entry_row.batch_subject_id

              and allocation.status =
                'Active'
          )
          then 'Same subject'
          else null
        end,

        case
          when exists (
            select 1
            from
              public.faculty_teaching_allocations allocation
            where
              allocation.faculty_id =
                availability.faculty_id

              and allocation.batch_id =
                entry_row.batch_id

              and allocation.status =
                'Active'
          )
          then 'Same batch'
          else null
        end,

        'Same department'
      ) as reason

    from
      public.faculty_recurring_availability availability

    join
      public.profiles profile
      on profile.id =
        availability.faculty_id

    where
      availability.profile_id =
        scheduling_profile_id

      and availability.day_of_week =
        entry_row.day_of_week

      and availability.period_slot_id =
        target_slot_id

      and availability.is_available =
        true

      and availability.faculty_id <>
        request_row.original_faculty_id

      and profile.role::text =
        'Faculty'


      -- Candidate must have at least one active teaching
      -- allocation belonging to the same department as the
      -- class being covered.
      and exists (
        select 1

        from
          public.faculty_teaching_allocations allocation

        join
          public.attendance_batches candidate_batch
          on candidate_batch.id =
            allocation.batch_id

        where
          allocation.faculty_id =
            availability.faculty_id

          and allocation.status =
            'Active'

          and upper(
            trim(
              candidate_batch.department
            )
          ) =
          upper(
            trim(
              target_batch.department
            )
          )
      )


      -- A faculty member who already declined this exact
      -- request is not automatically offered it again.
      and not exists (
        select 1
        from
          public.faculty_coverage_offers previous_offer
        where
          previous_offer.coverage_request_id =
            request_row.id

          and previous_offer.candidate_faculty_id =
            availability.faculty_id

          and previous_offer.status =
            'Declined'
      )


      -- Permanent timetable collision.
      and not exists (
        select 1
        from
          public.batch_timetable_entries busy
        where
          busy.faculty_id =
            availability.faculty_id

          and busy.day_of_week =
            entry_row.day_of_week

          and entry_row.start_time <
            busy.end_time

          and entry_row.end_time >
            busy.start_time
      )


      -- Date-specific unavailable / leave / blocked period.
      and not exists (
        select 1
        from
          public.faculty_unavailability unavailable
        where
          unavailable.faculty_id =
            availability.faculty_id

          and unavailable.unavailable_date =
            request_row.class_date

          and unavailable.status =
            'Active'

          and (
            unavailable.period_slot_id
              is null

            or exists (
              select 1
              from
                public.timetable_period_slots blocked_slot
              where
                blocked_slot.id =
                  unavailable.period_slot_id

                and entry_row.start_time <
                  blocked_slot.end_time

                and entry_row.end_time >
                  blocked_slot.start_time
            )
          )
      )


      -- Candidate cannot already be substituting elsewhere.
      and not exists (
        select 1
        from
          public.faculty_substitution_overrides substitution

        join
          public.batch_timetable_entries substitution_entry
          on substitution_entry.id =
            substitution.timetable_entry_id

        where
          substitution.substitute_faculty_id =
            availability.faculty_id

          and substitution.class_date =
            request_row.class_date

          and substitution.status =
            'Active'

          and entry_row.start_time <
            substitution_entry.end_time

          and entry_row.end_time >
            substitution_entry.start_time
      )
  ),


  inserted as (
    insert into
      public.faculty_coverage_offers (
        coverage_request_id,
        candidate_faculty_id,
        candidate_faculty_name,
        match_score,
        match_reason,
        status
      )

    select
      request_row.id,
      eligible.faculty_id,
      eligible.faculty_name,
      eligible.score,
      eligible.reason,
      'Pending'

    from
      eligible

    order by
      eligible.score desc,
      eligible.faculty_name

    on conflict (
      coverage_request_id,
      candidate_faculty_id
    )
    do update
    set
      candidate_faculty_name =
        excluded.candidate_faculty_name,

      match_score =
        excluded.match_score,

      match_reason =
        excluded.match_reason,

      status =
        'Pending',

      responded_at =
        null,

      updated_at =
        now()

    -- This WHERE is defensive. The eligible CTE already
    -- excludes Declined candidates.
    where
      faculty_coverage_offers.status <>
        'Declined'

    returning
      id,
      candidate_faculty_id,
      candidate_faculty_name,
      match_score,
      match_reason
  )

  select
    inserted.id,
    inserted.candidate_faculty_id,
    inserted.candidate_faculty_name,
    inserted.match_score,
    inserted.match_reason

  from
    inserted

  order by
    inserted.match_score desc,
    inserted.candidate_faculty_name;


  if exists (
    select 1
    from
      public.faculty_coverage_offers offer_row
    where
      offer_row.coverage_request_id =
        request_row.id

      and offer_row.status =
        'Pending'
  ) then

    update
      public.faculty_coverage_requests
    set
      status = 'Offered',
      updated_at = now()
    where
      id = request_row.id;

  else

    update
      public.faculty_coverage_requests
    set
      status = 'Uncovered',
      updated_at = now()
    where
      id = request_row.id;

  end if;

end;
$$;


revoke all
on function
public.generate_faculty_coverage_offers(uuid)
from public;


revoke all
on function
public.generate_faculty_coverage_offers(uuid)
from anon;


grant execute
on function
public.generate_faculty_coverage_offers(uuid)
to authenticated;


comment on function
public.generate_faculty_coverage_offers(uuid)
is
'Finds eligible faculty for a date-specific coverage request and creates ranked pending offers. Uses the coverage-offer unique constraint explicitly to avoid PL/pgSQL output-column ambiguity.';


notify pgrst, 'reload schema';
