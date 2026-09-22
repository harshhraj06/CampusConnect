-- ============================================================
-- CAMPUSCONNECT — FACULTY COVERAGE WORKFLOW
--
-- Controlled workflow:
--
--   Open coverage request
--          ↓
--   find eligible faculty
--          ↓
--   create ranked Pending offers
--          ↓
--   candidate Accept / Decline
--          ↓
--   atomic temporary substitution override
--
-- IMPORTANT:
--   batch_timetable_entries is NEVER modified here.
-- ============================================================


-- ============================================================
-- 1. GENERATE COVERAGE OFFERS
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
declare
  caller_id uuid;
  caller_role text;

  request_row
    public.faculty_coverage_requests%rowtype;

  entry_row
    public.batch_timetable_entries%rowtype;

  scheduling_profile_id uuid;

  target_slot_id uuid;
begin

  caller_id :=
    auth.uid();

  if caller_id is null then
    raise exception
      'Authentication required';
  end if;


  caller_role :=
    public.current_campus_role();


  select *
  into request_row
  from public.faculty_coverage_requests
  where id =
    p_coverage_request_id
  for update;


  if not found then
    raise exception
      'Coverage request does not exist';
  end if;


  if caller_role <> 'Main Admin'
     and request_row.original_faculty_id <>
       caller_id
  then
    raise exception
      'You do not have permission to generate offers for this request';
  end if;


  if request_row.status not in (
    'Open',
    'Offered'
  ) then
    raise exception
      'Coverage offers can only be generated for an open request';
  end if;


  if request_row.class_date <
    current_date
  then
    raise exception
      'Coverage offers cannot be generated for a past class';
  end if;


  select *
  into entry_row
  from public.batch_timetable_entries
  where id =
    request_row.timetable_entry_id;


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


  select
    mapping.profile_id
  into
    scheduling_profile_id
  from
    public.timetable_batch_profiles mapping
  where
    mapping.batch_id =
      entry_row.batch_id
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
    slot.period_order
  limit 1;


  if target_slot_id is null then
    raise exception
      'The class does not match a configured teaching period';
  end if;


  -- Existing Pending offers are regenerated so stale candidate
  -- rankings are not retained.
  update
    public.faculty_coverage_offers
  set
    status = 'Withdrawn',
    updated_at = now()
  where
    coverage_request_id =
      request_row.id

    and status =
      'Pending';


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
        end
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

      -- Candidate must have an active teaching allocation.
      and exists (
        select 1
        from
          public.faculty_teaching_allocations allocation
        where
          allocation.faculty_id =
            availability.faculty_id

          and allocation.status =
            'Active'
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

    returning
      id,
      faculty_coverage_offers.candidate_faculty_id,
      faculty_coverage_offers.candidate_faculty_name,
      faculty_coverage_offers.match_score,
      faculty_coverage_offers.match_reason
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
      public.faculty_coverage_offers offer
    where
      offer.coverage_request_id =
        request_row.id

      and offer.status =
        'Pending'
  ) then

    update
      public.faculty_coverage_requests
    set
      status = 'Offered',
      updated_at = now()
    where
      id =
        request_row.id;

  else

    update
      public.faculty_coverage_requests
    set
      status = 'Uncovered',
      updated_at = now()
    where
      id =
        request_row.id;

  end if;

end;
$$;


-- ============================================================
-- 2. RESPOND TO COVERAGE OFFER
-- ============================================================

create or replace function
public.respond_to_faculty_coverage_offer(
  p_offer_id uuid,
  p_response text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;

  offer_row
    public.faculty_coverage_offers%rowtype;

  request_row
    public.faculty_coverage_requests%rowtype;

  entry_row
    public.batch_timetable_entries%rowtype;

  override_id uuid;
begin

  caller_id :=
    auth.uid();


  if caller_id is null then
    raise exception
      'Authentication required';
  end if;


  if p_response not in (
    'Accepted',
    'Declined'
  ) then
    raise exception
      'Response must be Accepted or Declined';
  end if;


  select *
  into offer_row
  from
    public.faculty_coverage_offers
  where
    id =
      p_offer_id
  for update;


  if not found then
    raise exception
      'Coverage offer does not exist';
  end if;


  if offer_row.candidate_faculty_id <>
    caller_id
  then
    raise exception
      'Only the offered faculty member can respond';
  end if;


  if offer_row.status <>
    'Pending'
  then
    raise exception
      'This coverage offer is no longer pending';
  end if;


  select *
  into request_row
  from
    public.faculty_coverage_requests
  where
    id =
      offer_row.coverage_request_id
  for update;


  if not found then
    raise exception
      'Coverage request does not exist';
  end if;


  if request_row.status not in (
    'Open',
    'Offered'
  ) then
    raise exception
      'Coverage request is no longer accepting responses';
  end if;


  if p_response =
    'Declined'
  then

    update
      public.faculty_coverage_offers
    set
      status = 'Declined',
      responded_at = now(),
      updated_at = now()
    where
      id =
        offer_row.id;


    if not exists (
      select 1
      from
        public.faculty_coverage_offers remaining
      where
        remaining.coverage_request_id =
          request_row.id

        and remaining.status =
          'Pending'

        and remaining.id <>
          offer_row.id
    ) then

      update
        public.faculty_coverage_requests
      set
        status = 'Uncovered',
        updated_at = now()
      where
        id =
          request_row.id;

    end if;


    return null;

  end if;


  if request_row.class_date <
    current_date
  then
    raise exception
      'A past coverage request cannot be accepted';
  end if;


  select *
  into entry_row
  from
    public.batch_timetable_entries
  where
    id =
      request_row.timetable_entry_id;


  if not found then
    raise exception
      'Timetable entry no longer exists';
  end if;


  if exists (
    select 1
    from
      public.batch_timetable_entries busy
    where
      busy.faculty_id =
        caller_id

      and busy.day_of_week =
        entry_row.day_of_week

      and entry_row.start_time <
        busy.end_time

      and entry_row.end_time >
        busy.start_time
  ) then
    raise exception
      'You now have a permanent timetable collision';
  end if;


  if exists (
    select 1
    from
      public.faculty_unavailability unavailable
    where
      unavailable.faculty_id =
        caller_id

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
  ) then
    raise exception
      'You are marked unavailable for this class';
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
        caller_id

      and existing_override.class_date =
        request_row.class_date

      and existing_override.status =
        'Active'

      and entry_row.start_time <
        existing_entry.end_time

      and entry_row.end_time >
        existing_entry.start_time
  ) then
    raise exception
      'You already have another substitution during this time';
  end if;


  insert into
    public.faculty_substitution_overrides (
      coverage_request_id,
      timetable_entry_id,
      class_date,
      original_faculty_id,
      substitute_faculty_id,
      substitute_faculty_name,
      status,
      accepted_offer_id
    )
  values (
    request_row.id,
    request_row.timetable_entry_id,
    request_row.class_date,
    request_row.original_faculty_id,
    caller_id,
    offer_row.candidate_faculty_name,
    'Active',
    offer_row.id
  )
  returning id
  into override_id;


  update
    public.faculty_coverage_offers
  set
    status = 'Accepted',
    responded_at = now(),
    updated_at = now()
  where
    id =
      offer_row.id;


  update
    public.faculty_coverage_offers
  set
    status = 'Withdrawn',
    updated_at = now()
  where
    coverage_request_id =
      request_row.id

    and id <>
      offer_row.id

    and status =
      'Pending';


  update
    public.faculty_coverage_requests
  set
    status = 'Covered',
    updated_at = now()
  where
    id =
      request_row.id;


  return override_id;

end;
$$;


-- ============================================================
-- 3. FUNCTION SECURITY
-- ============================================================

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


revoke all
on function
public.respond_to_faculty_coverage_offer(uuid, text)
from public;


revoke all
on function
public.respond_to_faculty_coverage_offer(uuid, text)
from anon;


grant execute
on function
public.respond_to_faculty_coverage_offer(uuid, text)
to authenticated;


comment on function
public.generate_faculty_coverage_offers(uuid)
is
'Finds currently eligible faculty for a date-specific coverage request and creates ranked pending offers.';


comment on function
public.respond_to_faculty_coverage_offer(uuid, text)
is
'Atomically accepts or declines a substitute offer. Acceptance creates a temporary substitution override without changing the permanent timetable.';


notify pgrst, 'reload schema';
