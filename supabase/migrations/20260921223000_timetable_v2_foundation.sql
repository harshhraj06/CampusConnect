-- ============================================================
-- CAMPUSCONNECT — TIMETABLE V2 FOUNDATION
--
-- Purpose:
--
--   Main Admin
--       -> assigns Timetable Coordinator
--
--   Timetable Coordinator
--       -> one active coordinator per department
--       -> receives faculty timetable-change requests
--
--   Faculty
--       -> sees ONLY their own published teaching schedule
--       -> reports clashes
--       -> supplies available alternative slots
--
--   Student
--       -> existing get_my_timetable() remains unchanged
--
-- IMPORTANT:
--
-- This migration DOES NOT delete or replace:
--
--   timetable_publications
--   batch_timetable_entries
--   timetable_resources
--   timetable_period_slots
--   faculty_teaching_allocations
--   student timetable RPCs
--   faculty coverage workflow
--
-- Coordinator draft/edit/publish permissions will be cut over
-- only after the new Coordinator Studio UI is verified.
-- ============================================================



-- ============================================================
-- 1. TIMETABLE COORDINATOR ASSIGNMENTS
--
-- Historical rows remain for audit.
-- Exactly one ACTIVE coordinator is permitted per department.
-- ============================================================

create table if not exists
public.timetable_coordinator_assignments (

  id uuid primary key
    default gen_random_uuid(),

  department text not null
    check (
      char_length(
        btrim(
          department
        )
      ) between 2 and 80
    ),

  coordinator_id uuid not null
    references auth.users(id)
    on delete restrict,

  is_active boolean not null
    default true,

  assigned_by uuid not null
    references auth.users(id)
    on delete restrict,

  assigned_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()

);


create unique index if not exists
timetable_coordinator_one_active_department_idx
on public.timetable_coordinator_assignments (
  lower(
    btrim(
      department
    )
  )
)
where
  is_active;


create index if not exists
timetable_coordinator_user_idx
on public.timetable_coordinator_assignments (
  coordinator_id,
  is_active
);



-- ============================================================
-- 2. HELPER — AM I THE ACTIVE TIMETABLE COORDINATOR?
-- ============================================================

create or replace function
public.is_timetable_coordinator_for_department(
  p_department text
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

      when
        public.current_campus_role() <>
          'Coordinator'
        then false

      else exists (

        select
          1

        from
          public.timetable_coordinator_assignments assignment

        where
          assignment.coordinator_id =
            auth.uid()

          and assignment.is_active

          and lower(
            btrim(
              assignment.department
            )
          ) =
          lower(
            btrim(
              coalesce(
                p_department,
                ''
              )
            )
          )

      )

    end;
$$;


create or replace function
public.is_timetable_coordinator_for_batch(
  p_batch_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (

    select
      1

    from
      public.attendance_batches batch

    where
      batch.id =
        p_batch_id

      and
      public.is_timetable_coordinator_for_department(
        batch.department
      )

  );
$$;


revoke all
on function
public.is_timetable_coordinator_for_department(text)
from public, anon;


revoke all
on function
public.is_timetable_coordinator_for_batch(uuid)
from public, anon;


grant execute
on function
public.is_timetable_coordinator_for_department(text)
to authenticated;


grant execute
on function
public.is_timetable_coordinator_for_batch(uuid)
to authenticated;



-- ============================================================
-- 3. MAIN ADMIN ASSIGNS / REPLACES COORDINATOR
--
-- Main Admin controls WHO the coordinator is.
-- This does not grant Main Admin Timetable V2 editing rights.
-- ============================================================

create or replace function
public.assign_timetable_coordinator(

  p_department text,

  p_coordinator_id uuid

)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_department text;

  v_assignment_id uuid;

  v_target_role text;

begin

  if
    auth.uid() is null
  then
    raise exception
      'Authentication required.';
  end if;


  if
    public.current_campus_role() <>
      'Main Admin'
  then
    raise exception
      'Only Main Admin can assign a timetable coordinator.';
  end if;


  v_department :=
    btrim(
      coalesce(
        p_department,
        ''
      )
    );


  if
    char_length(
      v_department
    ) < 2
    or
    char_length(
      v_department
    ) > 80
  then
    raise exception
      'A valid department is required.';
  end if;


  select
    profile.role

  into
    v_target_role

  from
    public.profiles profile

  where
    profile.id =
      p_coordinator_id;


  if
    v_target_role is distinct from
      'Coordinator'
  then
    raise exception
      'The selected user must have the Coordinator role.';
  end if;


  -- Preserve old assignments for audit.

  update
    public.timetable_coordinator_assignments

  set
    is_active =
      false,

    updated_at =
      now()

  where
    lower(
      btrim(
        department
      )
    ) =
    lower(
      v_department
    )

    and is_active;


  insert into
  public.timetable_coordinator_assignments (

    department,

    coordinator_id,

    is_active,

    assigned_by

  )
  values (

    v_department,

    p_coordinator_id,

    true,

    auth.uid()

  )
  returning
    id
  into
    v_assignment_id;


  return
    v_assignment_id;

end;
$$;


revoke all
on function
public.assign_timetable_coordinator(
  text,
  uuid
)
from public, anon;


grant execute
on function
public.assign_timetable_coordinator(
  text,
  uuid
)
to authenticated;



-- ============================================================
-- 4. FACULTY PRIVATE WEEKLY TIMETABLE
--
-- SECURITY RULE:
--
-- No faculty ID is accepted as an argument.
--
-- The function ALWAYS uses auth.uid().
--
-- Therefore Faculty A cannot request Faculty B's schedule by
-- changing a URL, request payload or browser query.
-- ============================================================

create or replace function
public.get_my_faculty_timetable()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare

  v_result jsonb;

begin

  if
    auth.uid() is null
  then
    raise exception
      'Authentication required.';
  end if;


  if
    public.current_campus_role() <>
      'Faculty'
  then
    raise exception
      'This timetable is available only to Faculty.';
  end if;


  select
    coalesce(

      jsonb_agg(

        jsonb_build_object(

          'id',
            entry.id,

          'publicationId',
            publication.id,

          'versionNumber',
            publication.version_number,

          'batchId',
            batch.id,

          'batchName',
            batch.batch_name,

          'section',
            batch.section,

          'department',
            batch.department,

          'academicYear',
            batch.academic_year,

          'semester',
            batch.semester,

          'batchSubjectId',
            subject.id,

          'subjectName',
            subject.subject_name,

          'subjectCode',
            subject.subject_code,

          'subjectType',
            subject.subject_type,

          'facultyId',
            entry.faculty_id,

          'facultyName',
            entry.faculty_name,

          'dayOfWeek',
            entry.day_of_week,

          'periodOrder',
            entry.period_order,

          'startTime',
            entry.start_time,

          'endTime',
            entry.end_time,

          'room',
            entry.room,

          'resourceId',
            entry.resource_id,

          'resourceCode',
            resource.resource_code,

          'resourceName',
            resource.resource_name,

          'resourceType',
            resource.resource_type,

          'classType',
            entry.class_type,

          'subgroup',
            entry.subgroup

        )

        order by

          case
            entry.day_of_week

            when 'Monday'
              then 1

            when 'Tuesday'
              then 2

            when 'Wednesday'
              then 3

            when 'Thursday'
              then 4

            when 'Friday'
              then 5

            when 'Saturday'
              then 6

            else 99

          end,

          entry.start_time,

          entry.period_order

      ),

      '[]'::jsonb

    )

  into
    v_result

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

  left join
    public.timetable_resources resource
      on resource.id =
        entry.resource_id

  where
    publication.status =
      'Published'

    and entry.faculty_id =
      auth.uid();


  return
    v_result;

end;
$$;


revoke all
on function
public.get_my_faculty_timetable()
from public, anon;


grant execute
on function
public.get_my_faculty_timetable()
to authenticated;



-- ============================================================
-- 5. FACULTY TIMETABLE CHANGE / CLASH REQUEST
-- ============================================================

create table if not exists
public.timetable_change_requests (

  id uuid primary key
    default gen_random_uuid(),


  timetable_entry_id uuid
    references public.batch_timetable_entries(id)
    on delete set null,


  publication_id uuid
    references public.timetable_publications(id)
    on delete set null,


  batch_id uuid not null
    references public.attendance_batches(id)
    on delete restrict,


  batch_subject_id uuid not null
    references public.attendance_batch_subjects(id)
    on delete restrict,


  faculty_id uuid
    references auth.users(id)
    on delete set null,


  faculty_name text not null
    default '',


  -- Human-readable snapshot.
  -- Preserved even if the timetable changes later.

  batch_name text not null
    default '',

  section text not null
    default '',

  department text not null
    default '',

  subject_name text not null
    default '',

  subject_code text not null
    default '',


  original_day_of_week text not null
    check (
      original_day_of_week in (
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
      )
    ),

  original_period_order integer not null
    check (
      original_period_order
      between 1 and 20
    ),

  original_start_time time not null,

  original_end_time time not null,

  original_room text not null
    default '',

  original_class_type text not null
    default '',

  original_subgroup text not null
    default '',


  reason text not null
    check (
      char_length(
        btrim(
          reason
        )
      ) between 5 and 1000
    ),


  status text not null
    default 'Pending'
    check (
      status in (
        'Pending',
        'Reviewing',
        'Approved',
        'Rejected',
        'Rebuilt',
        'Cancelled'
      )
    ),


  coordinator_id uuid
    references auth.users(id)
    on delete set null,


  coordinator_note text not null
    default ''
    check (
      char_length(
        coordinator_note
      ) <= 2000
    ),


  resolution_publication_id uuid
    references public.timetable_publications(id)
    on delete set null,


  resolved_at timestamptz,


  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()

);


create index if not exists
timetable_change_requests_faculty_idx
on public.timetable_change_requests (
  faculty_id,
  created_at desc
);


create index if not exists
timetable_change_requests_department_idx
on public.timetable_change_requests (
  department,
  status,
  created_at desc
);


create index if not exists
timetable_change_requests_batch_idx
on public.timetable_change_requests (
  batch_id,
  status
);


create unique index if not exists
timetable_change_requests_one_open_entry_idx
on public.timetable_change_requests (
  timetable_entry_id,
  faculty_id
)
where
  status in (
    'Pending',
    'Reviewing'
  );



-- ============================================================
-- 6. FACULTY-PROVIDED ALTERNATIVE SLOTS
-- ============================================================

create table if not exists
public.timetable_change_request_options (

  id uuid primary key
    default gen_random_uuid(),

  request_id uuid not null
    references public.timetable_change_requests(id)
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

  period_slot_id uuid
    references public.timetable_period_slots(id)
    on delete set null,

  period_order integer not null
    check (
      period_order
      between 1 and 20
    ),

  period_label text not null
    default '',

  start_time time not null,

  end_time time not null,

  display_order integer not null
    check (
      display_order
      between 1 and 20
    ),

  created_at timestamptz not null
    default now(),

  check (
    end_time >
      start_time
  )

);


create unique index if not exists
timetable_change_request_option_unique_idx
on public.timetable_change_request_options (
  request_id,
  day_of_week,
  period_slot_id
);



-- ============================================================
-- 7. UPDATED_AT
-- ============================================================

create or replace function
public.set_timetable_v2_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  new.updated_at :=
    now();

  return new;

end;
$$;


drop trigger if exists
set_timetable_coordinator_assignment_updated_at
on public.timetable_coordinator_assignments;


create trigger
set_timetable_coordinator_assignment_updated_at

before update
on public.timetable_coordinator_assignments

for each row
execute function
public.set_timetable_v2_updated_at();


drop trigger if exists
set_timetable_change_request_updated_at
on public.timetable_change_requests;


create trigger
set_timetable_change_request_updated_at

before update
on public.timetable_change_requests

for each row
execute function
public.set_timetable_v2_updated_at();



-- ============================================================
-- 7B. FACULTY CHANGE-REQUEST SLOT OPTIONS
--
-- Returns teaching slots belonging to the affected batch's
-- scheduling profile.
--
-- IMPORTANT:
--   • The timetable entry must belong to auth.uid().
--   • Only Published timetable entries can be changed.
--   • Slots that overlap another Published class taught by
--     this Faculty member are excluded.
--   • The existing class time itself is excluded.
--
-- Room/lab and full batch collision validation remains the
-- responsibility of the Coordinator rebuild/publish engine.
-- ============================================================

create or replace function
public.get_my_timetable_change_options(
  p_timetable_entry_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare

  v_entry record;

  v_result jsonb;

begin

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  if public.current_campus_role() <>
    'Faculty'
  then
    raise exception
      'Only Faculty can view timetable change options.';
  end if;


  select

    entry.id,
    entry.batch_id,
    entry.faculty_id,
    entry.day_of_week,
    entry.start_time,
    entry.end_time,

    mapping.profile_id

  into
    v_entry

  from
    public.batch_timetable_entries entry

  join
    public.timetable_publications publication
      on publication.id =
        entry.publication_id

  join
    public.timetable_batch_profiles mapping
      on mapping.batch_id =
        entry.batch_id

  where
    entry.id =
      p_timetable_entry_id

    and entry.faculty_id =
      auth.uid()

    and publication.status =
      'Published';


  if v_entry.id is null then
    raise exception
      'The selected published class is not part of your timetable.';
  end if;


  select
    coalesce(

      jsonb_agg(

        jsonb_build_object(

          'dayOfWeek',
            working_day.day_of_week,

          'periodSlotId',
            slot.id,

          'periodOrder',
            slot.period_order,

          'periodLabel',
            slot.label,

          'startTime',
            slot.start_time,

          'endTime',
            slot.end_time

        )

        order by

          working_day.display_order,

          slot.start_time,

          slot.period_order

      ),

      '[]'::jsonb

    )

  into
    v_result

  from
    public.timetable_working_days working_day

  join
    public.timetable_period_slots slot
      on slot.profile_id =
        working_day.profile_id

  where
    working_day.profile_id =
      v_entry.profile_id

    and working_day.is_working_day

    and slot.is_teaching_slot

    and not (

      working_day.day_of_week =
        v_entry.day_of_week

      and slot.start_time =
        v_entry.start_time

      and slot.end_time =
        v_entry.end_time

    )

    and not exists (

      select
        1

      from
        public.batch_timetable_entries existing

      join
        public.timetable_publications existing_publication
          on existing_publication.id =
            existing.publication_id

      where
        existing.faculty_id =
          auth.uid()

        and existing.id <>
          v_entry.id

        and existing_publication.status =
          'Published'

        and existing.day_of_week =
          working_day.day_of_week

        and slot.start_time <
          existing.end_time

        and slot.end_time >
          existing.start_time

    );


  return v_result;

end;
$$;


revoke all
on function
public.get_my_timetable_change_options(uuid)
from public, anon;


grant execute
on function
public.get_my_timetable_change_options(uuid)
to authenticated;



-- ============================================================
-- 8. CREATE FACULTY CHANGE REQUEST
--
-- p_alternatives:
--
-- [
--   {
--     "dayOfWeek": "Tuesday",
--     "periodSlotId": "uuid"
--   },
--   {
--     "dayOfWeek": "Friday",
--     "periodSlotId": "uuid"
--   }
-- ]
-- ============================================================

create or replace function
public.create_timetable_change_request(

  p_timetable_entry_id uuid,

  p_reason text,

  p_alternatives jsonb

)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_entry record;

  v_request_id uuid;

  v_option jsonb;

  v_option_count integer;

  v_display_order integer :=
    0;

  v_day text;

  v_slot_id uuid;

  v_slot record;

begin

  if
    auth.uid() is null
  then
    raise exception
      'Authentication required.';
  end if;


  if
    public.current_campus_role() <>
      'Faculty'
  then
    raise exception
      'Only Faculty can submit timetable change requests.';
  end if;


  if
    char_length(
      btrim(
        coalesce(
          p_reason,
          ''
        )
      )
    ) < 5
  then
    raise exception
      'Please explain the timetable conflict or change reason.';
  end if;


  if
    p_alternatives is null
    or
    jsonb_typeof(
      p_alternatives
    ) <>
      'array'
  then
    raise exception
      'Available alternative slots are required.';
  end if;


  v_option_count :=
    jsonb_array_length(
      p_alternatives
    );


  if
    v_option_count < 1
    or
    v_option_count > 12
  then
    raise exception
      'Choose between 1 and 12 available alternative slots.';
  end if;


  select

    entry.id,

    entry.publication_id,

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

    batch.batch_name,

    batch.section,

    batch.department,

    subject.subject_name,

    subject.subject_code

  into
    v_entry

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

  where
    entry.id =
      p_timetable_entry_id

    and publication.status =
      'Published'

    and entry.faculty_id =
      auth.uid();


  if
    v_entry.id is null
  then
    raise exception
      'The selected published class is not part of your timetable.';
  end if;


  if exists (

    select
      1

    from
      public.timetable_change_requests request

    where
      request.timetable_entry_id =
        p_timetable_entry_id

      and request.faculty_id =
        auth.uid()

      and request.status in (
        'Pending',
        'Reviewing'
      )

  )
  then

    raise exception
      'An open change request already exists for this class.';

  end if;


  insert into
  public.timetable_change_requests (

    timetable_entry_id,

    publication_id,

    batch_id,

    batch_subject_id,

    faculty_id,

    faculty_name,

    batch_name,

    section,

    department,

    subject_name,

    subject_code,

    original_day_of_week,

    original_period_order,

    original_start_time,

    original_end_time,

    original_room,

    original_class_type,

    original_subgroup,

    reason

  )
  values (

    v_entry.id,

    v_entry.publication_id,

    v_entry.batch_id,

    v_entry.batch_subject_id,

    auth.uid(),

    coalesce(
      v_entry.faculty_name,
      ''
    ),

    coalesce(
      v_entry.batch_name,
      ''
    ),

    coalesce(
      v_entry.section,
      ''
    ),

    coalesce(
      v_entry.department,
      ''
    ),

    coalesce(
      v_entry.subject_name,
      ''
    ),

    coalesce(
      v_entry.subject_code,
      ''
    ),

    v_entry.day_of_week,

    v_entry.period_order,

    v_entry.start_time,

    v_entry.end_time,

    coalesce(
      v_entry.room,
      ''
    ),

    coalesce(
      v_entry.class_type,
      ''
    ),

    coalesce(
      v_entry.subgroup,
      ''
    ),

    btrim(
      p_reason
    )

  )
  returning
    id
  into
    v_request_id;


  for
    v_option

  in
    select
      value

    from
      jsonb_array_elements(
        p_alternatives
      )

  loop

    if
      jsonb_typeof(
        v_option
      ) <>
      'object'
    then
      raise exception
        'Each available timetable option must be an object.';
    end if;


    v_day :=
      btrim(
        coalesce(
          v_option ->>
            'dayOfWeek',
          ''
        )
      );


    if
      v_day not in (
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
      )
    then
      raise exception
        'Invalid alternative timetable day: %',
        v_day;
    end if;


    begin

      v_slot_id :=
        (
          v_option ->>
            'periodSlotId'
        )::uuid;

    exception

      when invalid_text_representation
      then

        raise exception
          'An alternative period slot is invalid.';

    end;


    select

      slot.id,

      slot.profile_id,

      slot.period_order,

      slot.label,

      slot.start_time,

      slot.end_time,

      slot.is_teaching_slot

    into
      v_slot

    from
      public.timetable_period_slots slot

    where
      slot.id =
        v_slot_id;


    if
      v_slot.id is null
      or
      not v_slot.is_teaching_slot
    then
      raise exception
        'The selected alternative period is not a valid teaching slot.';
    end if;


    -- Slot must belong to the scheduling profile assigned to
    -- this class's batch.

    if not exists (

      select
        1

      from
        public.timetable_batch_profiles mapping

      where
        mapping.batch_id =
          v_entry.batch_id

        and mapping.profile_id =
          v_slot.profile_id

    )
    then
      raise exception
        'The selected alternative period does not belong to this batch schedule.';
    end if;


    -- Day must be an active working day for that profile.

    if not exists (

      select
        1

      from
        public.timetable_working_days working_day

      where
        working_day.profile_id =
          v_slot.profile_id

        and working_day.day_of_week =
          v_day

        and working_day.is_working_day

    )
    then
      raise exception
        'The selected alternative day is not an active working day.';
    end if;


    -- Submitting the exact existing class slot is not an
    -- alternative.

    if
      v_day =
        v_entry.day_of_week

      and v_slot.start_time =
        v_entry.start_time

      and v_slot.end_time =
        v_entry.end_time
    then
      raise exception
        'An alternative slot cannot be identical to the current class time.';
    end if;


    -- A Faculty member must not propose another time where
    -- they already teach a Published class.

    if exists (

      select
        1

      from
        public.batch_timetable_entries existing

      join
        public.timetable_publications existing_publication
          on existing_publication.id =
            existing.publication_id

      where
        existing.faculty_id =
          auth.uid()

        and existing.id <>
          v_entry.id

        and existing_publication.status =
          'Published'

        and existing.day_of_week =
          v_day

        and v_slot.start_time <
          existing.end_time

        and v_slot.end_time >
          existing.start_time

    )
    then
      raise exception
        'One of the selected alternatives overlaps another class in your published Faculty timetable.';
    end if;


    v_display_order :=
      v_display_order +
      1;


    insert into
    public.timetable_change_request_options (

      request_id,

      day_of_week,

      period_slot_id,

      period_order,

      period_label,

      start_time,

      end_time,

      display_order

    )
    values (

      v_request_id,

      v_day,

      v_slot.id,

      v_slot.period_order,

      coalesce(
        v_slot.label,
        ''
      ),

      v_slot.start_time,

      v_slot.end_time,

      v_display_order

    );

  end loop;


  return
    v_request_id;

end;
$$;



-- ============================================================
-- 9. FACULTY REQUEST HISTORY
-- ============================================================

create or replace function
public.get_my_timetable_change_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare

  v_result jsonb;

begin

  if
    auth.uid() is null
  then
    raise exception
      'Authentication required.';
  end if;


  if
    public.current_campus_role() <>
      'Faculty'
  then
    raise exception
      'This request history is available only to Faculty.';
  end if;


  select
    coalesce(

      jsonb_agg(

        jsonb_build_object(

          'id',
            request.id,

          'timetableEntryId',
            request.timetable_entry_id,

          'publicationId',
            request.publication_id,

          'batchId',
            request.batch_id,

          'batchSubjectId',
            request.batch_subject_id,

          'facultyName',
            request.faculty_name,

          'batchName',
            request.batch_name,

          'section',
            request.section,

          'department',
            request.department,

          'subjectName',
            request.subject_name,

          'subjectCode',
            request.subject_code,

          'originalDayOfWeek',
            request.original_day_of_week,

          'originalPeriodOrder',
            request.original_period_order,

          'originalStartTime',
            request.original_start_time,

          'originalEndTime',
            request.original_end_time,

          'originalRoom',
            request.original_room,

          'originalClassType',
            request.original_class_type,

          'originalSubgroup',
            request.original_subgroup,

          'reason',
            request.reason,

          'status',
            request.status,

          'coordinatorNote',
            request.coordinator_note,

          'resolutionPublicationId',
            request.resolution_publication_id,

          'resolvedAt',
            request.resolved_at,

          'createdAt',
            request.created_at,

          'updatedAt',
            request.updated_at,

          'alternatives',

            coalesce(
              (
                select
                  jsonb_agg(

                    jsonb_build_object(

                      'id',
                        option.id,

                      'dayOfWeek',
                        option.day_of_week,

                      'periodSlotId',
                        option.period_slot_id,

                      'periodOrder',
                        option.period_order,

                      'periodLabel',
                        option.period_label,

                      'startTime',
                        option.start_time,

                      'endTime',
                        option.end_time

                    )

                    order by
                      option.display_order

                  )

                from
                  public.timetable_change_request_options option

                where
                  option.request_id =
                    request.id
              ),

              '[]'::jsonb
            )

        )

        order by
          request.created_at desc

      ),

      '[]'::jsonb

    )

  into
    v_result

  from
    public.timetable_change_requests request

  where
    request.faculty_id =
      auth.uid();


  return
    v_result;

end;
$$;



-- ============================================================
-- 10. FACULTY CANCELS A STILL-PENDING REQUEST
-- ============================================================

create or replace function
public.cancel_my_timetable_change_request(
  p_request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_updated integer;

begin

  if
    auth.uid() is null
  then
    raise exception
      'Authentication required.';
  end if;


  if
    public.current_campus_role() <>
      'Faculty'
  then
    raise exception
      'Only Faculty can cancel their timetable requests.';
  end if;


  update
    public.timetable_change_requests

  set
    status =
      'Cancelled',

    updated_at =
      now()

  where
    id =
      p_request_id

    and faculty_id =
      auth.uid()

    and status =
      'Pending';


  get diagnostics
    v_updated =
      row_count;


  if
    v_updated <>
      1
  then
    raise exception
      'Only your own pending timetable request can be cancelled.';
  end if;


  return
    true;

end;
$$;



-- ============================================================
-- 11. COORDINATOR REQUEST INBOX
--
-- Coordinator can only retrieve requests belonging to a
-- department where they are the ACTIVE assigned coordinator.
-- ============================================================

create or replace function
public.get_coordinator_timetable_change_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare

  v_result jsonb;

begin

  if
    auth.uid() is null
  then
    raise exception
      'Authentication required.';
  end if;


  if
    public.current_campus_role() <>
      'Coordinator'
  then
    raise exception
      'Only a Timetable Coordinator can open this request inbox.';
  end if;


  select
    coalesce(

      jsonb_agg(

        jsonb_build_object(

          'id',
            request.id,

          'timetableEntryId',
            request.timetable_entry_id,

          'publicationId',
            request.publication_id,

          'batchId',
            request.batch_id,

          'batchSubjectId',
            request.batch_subject_id,

          'facultyId',
            request.faculty_id,

          'facultyName',
            request.faculty_name,

          'batchName',
            request.batch_name,

          'section',
            request.section,

          'department',
            request.department,

          'subjectName',
            request.subject_name,

          'subjectCode',
            request.subject_code,

          'originalDayOfWeek',
            request.original_day_of_week,

          'originalPeriodOrder',
            request.original_period_order,

          'originalStartTime',
            request.original_start_time,

          'originalEndTime',
            request.original_end_time,

          'originalRoom',
            request.original_room,

          'originalClassType',
            request.original_class_type,

          'originalSubgroup',
            request.original_subgroup,

          'reason',
            request.reason,

          'status',
            request.status,

          'coordinatorNote',
            request.coordinator_note,

          'resolutionPublicationId',
            request.resolution_publication_id,

          'resolvedAt',
            request.resolved_at,

          'createdAt',
            request.created_at,

          'updatedAt',
            request.updated_at,

          'alternatives',

            coalesce(
              (
                select
                  jsonb_agg(

                    jsonb_build_object(

                      'id',
                        option.id,

                      'dayOfWeek',
                        option.day_of_week,

                      'periodSlotId',
                        option.period_slot_id,

                      'periodOrder',
                        option.period_order,

                      'periodLabel',
                        option.period_label,

                      'startTime',
                        option.start_time,

                      'endTime',
                        option.end_time

                    )

                    order by
                      option.display_order

                  )

                from
                  public.timetable_change_request_options option

                where
                  option.request_id =
                    request.id
              ),

              '[]'::jsonb
            )

        )

        order by

          case
            request.status

            when 'Pending'
              then 1

            when 'Reviewing'
              then 2

            else 3

          end,

          request.created_at desc

      ),

      '[]'::jsonb

    )

  into
    v_result

  from
    public.timetable_change_requests request

  where
    public.is_timetable_coordinator_for_department(
      request.department
    );


  return
    v_result;

end;
$$;



-- ============================================================
-- 12. RLS
-- ============================================================

alter table
public.timetable_coordinator_assignments
enable row level security;


alter table
public.timetable_change_requests
enable row level security;


alter table
public.timetable_change_request_options
enable row level security;



-- ------------------------------------------------------------
-- COORDINATOR ASSIGNMENTS — READ ONLY
-- ------------------------------------------------------------

drop policy if exists
"Main Admin reads timetable coordinator assignments"
on public.timetable_coordinator_assignments;


create policy
"Main Admin reads timetable coordinator assignments"

on public.timetable_coordinator_assignments

for select
to authenticated

using (
  public.current_campus_role() =
    'Main Admin'
);


drop policy if exists
"Coordinator reads own timetable assignment"
on public.timetable_coordinator_assignments;


create policy
"Coordinator reads own timetable assignment"

on public.timetable_coordinator_assignments

for select
to authenticated

using (
  coordinator_id =
    auth.uid()
);



-- ------------------------------------------------------------
-- CHANGE REQUEST — FACULTY OWN + ASSIGNED COORDINATOR + ADMIN
-- ------------------------------------------------------------

drop policy if exists
"Timetable request authorized readers"
on public.timetable_change_requests;


create policy
"Timetable request authorized readers"

on public.timetable_change_requests

for select
to authenticated

using (

  faculty_id =
    auth.uid()

  or

  public.is_timetable_coordinator_for_department(
    department
  )

  or

  public.current_campus_role() =
    'Main Admin'

);



-- ------------------------------------------------------------
-- REQUEST OPTIONS — AUTHORIZED VIA PARENT REQUEST
-- ------------------------------------------------------------

drop policy if exists
"Timetable request option authorized readers"
on public.timetable_change_request_options;


create policy
"Timetable request option authorized readers"

on public.timetable_change_request_options

for select
to authenticated

using (

  exists (

    select
      1

    from
      public.timetable_change_requests request

    where
      request.id =
        timetable_change_request_options.request_id

      and (

        request.faculty_id =
          auth.uid()

        or

        public.is_timetable_coordinator_for_department(
          request.department
        )

        or

        public.current_campus_role() =
          'Main Admin'

      )

  )

);



-- ============================================================
-- 13. TABLE PRIVILEGES
--
-- Direct mutation is intentionally blocked.
-- Changes happen through validated SECURITY DEFINER RPCs.
-- ============================================================

revoke all
on table
public.timetable_coordinator_assignments
from public, anon, authenticated;


revoke all
on table
public.timetable_change_requests
from public, anon, authenticated;


revoke all
on table
public.timetable_change_request_options
from public, anon, authenticated;


grant select
on table
public.timetable_coordinator_assignments
to authenticated;


grant select
on table
public.timetable_change_requests
to authenticated;


grant select
on table
public.timetable_change_request_options
to authenticated;



-- ============================================================
-- 14. RPC PRIVILEGES
-- ============================================================

revoke all
on function
public.get_my_faculty_timetable()
from public, anon;


revoke all
on function
public.create_timetable_change_request(
  uuid,
  text,
  jsonb
)
from public, anon;


revoke all
on function
public.get_my_timetable_change_requests()
from public, anon;


revoke all
on function
public.cancel_my_timetable_change_request(uuid)
from public, anon;


revoke all
on function
public.get_coordinator_timetable_change_requests()
from public, anon;


grant execute
on function
public.get_my_faculty_timetable()
to authenticated;


grant execute
on function
public.create_timetable_change_request(
  uuid,
  text,
  jsonb
)
to authenticated;


grant execute
on function
public.get_my_timetable_change_requests()
to authenticated;


grant execute
on function
public.cancel_my_timetable_change_request(uuid)
to authenticated;


grant execute
on function
public.get_coordinator_timetable_change_requests()
to authenticated;



-- ============================================================
-- 15. DOCUMENTATION
-- ============================================================

comment on table
public.timetable_coordinator_assignments
is
'Timetable V2 assignment history. Exactly one active Timetable Coordinator is allowed per department.';


comment on function
public.get_my_faculty_timetable()
is
'Returns only Published timetable entries whose faculty_id equals auth.uid(). No other faculty schedule can be requested.';


comment on table
public.timetable_change_requests
is
'Faculty timetable clash/change requests. Stores an immutable snapshot of the affected published class.';


comment on table
public.timetable_change_request_options
is
'Faculty-provided alternative working-day/period options attached to a timetable change request.';




-- ============================================================
-- 16. TIMETABLE COORDINATOR STUDIO — SECURE OVERVIEW
--
-- This returns ONLY batches belonging to departments where the
-- authenticated Coordinator has an ACTIVE timetable assignment.
--
-- It does not expose another department's coordinator workspace.
-- ============================================================

create or replace function
public.get_my_timetable_coordinator_workspace()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare

  v_result jsonb;

begin

  if
    auth.uid() is null
  then
    raise exception
      'Authentication required.';
  end if;


  if
    public.current_campus_role() <>
      'Coordinator'
  then
    raise exception
      'Timetable Coordinator permission required.';
  end if;


  select
    jsonb_build_object(

      'assigned',

        exists (

          select
            1

          from
            public.timetable_coordinator_assignments assignment

          where
            assignment.coordinator_id =
              auth.uid()

            and assignment.is_active

        ),


      'departments',

        coalesce(
          (
            select
              jsonb_agg(

                jsonb_build_object(

                  'assignmentId',
                    assignment.id,

                  'department',
                    assignment.department,

                  'assignedAt',
                    assignment.assigned_at

                )

                order by
                  assignment.department

              )

            from
              public.timetable_coordinator_assignments assignment

            where
              assignment.coordinator_id =
                auth.uid()

              and assignment.is_active
          ),

          '[]'::jsonb
        ),


      'batches',

        coalesce(
          (
            select
              jsonb_agg(

                jsonb_build_object(

                  'id',
                    batch.id,

                  'batchName',
                    batch.batch_name,

                  'section',
                    batch.section,

                  'department',
                    batch.department,

                  'academicYear',
                    batch.academic_year,

                  'semester',
                    batch.semester,

                  'publicationId',
                    publication.id,

                  'versionNumber',
                    publication.version_number,

                  'publishedAt',
                    publication.published_at,

                  'entryCount',

                    case
                      when
                        publication.id is null
                      then
                        0

                      else
                        (
                          select
                            count(*)

                          from
                            public.batch_timetable_entries entry

                          where
                            entry.publication_id =
                              publication.id
                        )
                    end

                )

                order by

                  batch.department,

                  batch.batch_name,

                  batch.section

              )

            from
              public.attendance_batches batch

            left join lateral (

              select

                candidate.id,

                candidate.version_number,

                candidate.published_at

              from
                public.timetable_publications candidate

              where
                candidate.batch_id =
                  batch.id

                and candidate.status =
                  'Published'

              order by
                candidate.version_number desc

              limit 1

            ) publication
              on true

            where
              exists (

                select
                  1

                from
                  public.timetable_coordinator_assignments assignment

                where
                  assignment.coordinator_id =
                    auth.uid()

                  and assignment.is_active

                  and lower(
                    btrim(
                      assignment.department
                    )
                  ) =
                  lower(
                    btrim(
                      batch.department
                    )
                  )

              )
          ),

          '[]'::jsonb
        ),


      'requestSummary',

        jsonb_build_object(

          'pending',

            (
              select
                count(*)

              from
                public.timetable_change_requests request

              where
                request.status =
                  'Pending'

                and
                public.is_timetable_coordinator_for_department(
                  request.department
                )
            ),

          'reviewing',

            (
              select
                count(*)

              from
                public.timetable_change_requests request

              where
                request.status =
                  'Reviewing'

                and
                public.is_timetable_coordinator_for_department(
                  request.department
                )
            ),

          'resolved',

            (
              select
                count(*)

              from
                public.timetable_change_requests request

              where
                request.status in (
                  'Rebuilt',
                  'Rejected'
                )

                and
                public.is_timetable_coordinator_for_department(
                  request.department
                )
            )

        )

    )

  into
    v_result;


  return
    v_result;

end;
$$;


revoke all
on function
public.get_my_timetable_coordinator_workspace()
from public, anon;


grant execute
on function
public.get_my_timetable_coordinator_workspace()
to authenticated;



-- ============================================================
-- 17. COORDINATOR REVIEW ACTION
--
-- This RPC intentionally does NOT alter timetable entries.
--
-- Allowed:
--   Pending   -> Reviewing
--   Pending   -> Rejected
--   Reviewing -> Rejected
--
-- Applying/rebuilding a timetable remains a separate atomic
-- operation implemented in the next cutover batch.
-- ============================================================

create or replace function
public.review_timetable_change_request(

  p_request_id uuid,

  p_action text,

  p_note text
    default ''

)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_request
    public.timetable_change_requests%rowtype;

  v_action text;

  v_note text;

begin

  if
    auth.uid() is null
  then
    raise exception
      'Authentication required.';
  end if;


  if
    public.current_campus_role() <>
      'Coordinator'
  then
    raise exception
      'Timetable Coordinator permission required.';
  end if;


  v_action :=
    initcap(
      lower(
        btrim(
          coalesce(
            p_action,
            ''
          )
        )
      )
    );


  v_note :=
    btrim(
      coalesce(
        p_note,
        ''
      )
    );


  if
    v_action not in (
      'Reviewing',
      'Rejected'
    )
  then
    raise exception
      'Coordinator action must be Reviewing or Rejected.';
  end if;


  if
    char_length(
      v_note
    ) > 2000
  then
    raise exception
      'Coordinator note cannot exceed 2000 characters.';
  end if;


  if
    v_action =
      'Rejected'

    and
    char_length(
      v_note
    ) < 3
  then
    raise exception
      'Add a short explanation before rejecting the request.';
  end if;


  select
    request.*

  into
    v_request

  from
    public.timetable_change_requests request

  where
    request.id =
      p_request_id

  for update;


  if
    v_request.id is null
  then
    raise exception
      'Timetable change request not found.';
  end if;


  if not
    public.is_timetable_coordinator_for_department(
      v_request.department
    )
  then
    raise exception
      'This request does not belong to your assigned timetable department.';
  end if;


  if
    v_request.status not in (
      'Pending',
      'Reviewing'
    )
  then
    raise exception
      'Only an open timetable request can be reviewed.';
  end if;


  update
    public.timetable_change_requests

  set
    status =
      v_action,

    coordinator_id =
      auth.uid(),

    coordinator_note =
      v_note,

    resolved_at =
      case
        when
          v_action =
            'Rejected'
        then
          now()

        else
          null
      end,

    updated_at =
      now()

  where
    id =
      v_request.id;


  return
    jsonb_build_object(

      'id',
        v_request.id,

      'status',
        v_action,

      'coordinatorNote',
        v_note

    );

end;
$$;


revoke all
on function
public.review_timetable_change_request(
  uuid,
  text,
  text
)
from public, anon;


grant execute
on function
public.review_timetable_change_request(
  uuid,
  text,
  text
)
to authenticated;


comment on function
public.get_my_timetable_coordinator_workspace()
is
'Department-scoped Timetable Coordinator Studio overview. Returns only departments actively assigned to auth.uid().';


comment on function
public.review_timetable_change_request(
  uuid,
  text,
  text
)
is
'Allows the assigned Timetable Coordinator to mark an open request Reviewing or Rejected without mutating the published timetable.';





-- ============================================================
-- 18. ATOMIC COORDINATOR TIMETABLE REBUILD
--
-- Workflow:
--
--   1. Validate authenticated active Timetable Coordinator.
--   2. Lock the Faculty request.
--   3. Confirm request still belongs to CURRENT Published
--      timetable version.
--   4. Validate chosen Faculty-provided alternative.
--   5. Detect:
--        - Faculty collision
--        - Batch/subgroup collision
--        - Room/lab resource collision
--        - Named-room collision where no resource UUID exists
--   6. Clone entire current timetable to a new Draft version.
--   7. Move the requested class in the new version.
--   8. Supersede old version.
--   9. Publish new version.
--  10. Mark request Rebuilt.
--
-- All actions happen inside ONE database transaction.
--
-- If any validation or insert fails, PostgreSQL rolls back the
-- whole function automatically and the previous Published
-- timetable remains unchanged.
--
-- IMPORTANT:
-- Multi-period contiguous sessions are intentionally blocked
-- in this first atomic move path. Splitting one period from a
-- laboratory/session would corrupt the timetable. Full
-- multi-period rescheduling is handled by the subsequent full
-- Timetable Builder.
-- ============================================================

create or replace function
public.apply_timetable_change_request(

  p_request_id uuid,

  p_option_id uuid,

  p_note text
    default ''

)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_request
    public.timetable_change_requests%rowtype;

  v_option
    public.timetable_change_request_options%rowtype;

  v_current_publication
    public.timetable_publications%rowtype;

  v_original
    public.batch_timetable_entries%rowtype;

  v_slot
    public.timetable_period_slots%rowtype;

  v_new_publication_id uuid;

  v_next_version integer;

  v_entry_count integer;

  v_note text;

  v_original_subgroup text;

begin

  -- ----------------------------------------------------------
  -- Authentication / role
  -- ----------------------------------------------------------

  if
    auth.uid() is null
  then
    raise exception
      'Authentication required.';
  end if;


  if
    public.current_campus_role() <>
      'Coordinator'
  then
    raise exception
      'Timetable Coordinator permission required.';
  end if;


  v_note :=
    btrim(
      coalesce(
        p_note,
        ''
      )
    );


  if
    char_length(
      v_note
    ) > 2000
  then
    raise exception
      'Coordinator note cannot exceed 2000 characters.';
  end if;


  -- ----------------------------------------------------------
  -- Lock request
  -- ----------------------------------------------------------

  select
    request.*

  into
    v_request

  from
    public.timetable_change_requests request

  where
    request.id =
      p_request_id

  for update;


  if
    v_request.id is null
  then
    raise exception
      'Timetable change request not found.';
  end if;


  if not
    public.is_timetable_coordinator_for_department(
      v_request.department
    )
  then
    raise exception
      'This request is outside your assigned timetable department.';
  end if;


  if
    v_request.status not in (
      'Pending',
      'Reviewing'
    )
  then
    raise exception
      'Only an open timetable request can be rebuilt.';
  end if;


  -- ----------------------------------------------------------
  -- Chosen Faculty alternative
  -- ----------------------------------------------------------

  select
    option.*

  into
    v_option

  from
    public.timetable_change_request_options option

  where
    option.id =
      p_option_id

    and option.request_id =
      v_request.id;


  if
    v_option.id is null
  then
    raise exception
      'Select one of the Faculty-provided alternative times.';
  end if;


  if
    v_option.period_slot_id is null
  then
    raise exception
      'The selected period no longer exists. Ask the Faculty member to submit a new request.';
  end if;


  -- ----------------------------------------------------------
  -- Current publication for affected batch
  -- ----------------------------------------------------------

  select
    publication.*

  into
    v_current_publication

  from
    public.timetable_publications publication

  where
    publication.batch_id =
      v_request.batch_id

    and publication.status =
      'Published'

  order by
    publication.version_number desc

  limit 1

  for update;


  if
    v_current_publication.id is null
  then
    raise exception
      'This batch has no current Published timetable.';
  end if;


  -- Request must still refer to the version currently visible
  -- to students/faculty.

  if
    v_request.publication_id is distinct from
      v_current_publication.id
  then
    raise exception
      'This request belongs to an older timetable version. Ask the Faculty member to review the latest timetable and submit a new request if required.';
  end if;


  -- ----------------------------------------------------------
  -- Original timetable entry
  -- ----------------------------------------------------------

  select
    entry.*

  into
    v_original

  from
    public.batch_timetable_entries entry

  where
    entry.id =
      v_request.timetable_entry_id

    and entry.publication_id =
      v_current_publication.id

    and entry.batch_id =
      v_request.batch_id

  for update;


  if
    v_original.id is null
  then
    raise exception
      'The original class no longer exists in the current Published timetable.';
  end if;


  v_original_subgroup :=
    upper(
      btrim(
        coalesce(
          v_original.subgroup,
          ''
        )
      )
    );


  -- ----------------------------------------------------------
  -- Prevent accidental splitting of a multi-period session.
  --
  -- Same subject/faculty/subgroup on an immediately adjacent
  -- period is treated as one teaching session.
  -- ----------------------------------------------------------

  if exists (

    select
      1

    from
      public.batch_timetable_entries adjacent

    where
      adjacent.publication_id =
        v_current_publication.id

      and adjacent.id <>
        v_original.id

      and adjacent.batch_subject_id =
        v_original.batch_subject_id

      and adjacent.faculty_id =
        v_original.faculty_id

      and adjacent.day_of_week =
        v_original.day_of_week

      and upper(
        btrim(
          coalesce(
            adjacent.subgroup,
            ''
          )
        )
      ) =
      v_original_subgroup

      and (
        (
          adjacent.period_order =
            v_original.period_order - 1

          and adjacent.end_time =
            v_original.start_time
        )

        or

        (
          adjacent.period_order =
            v_original.period_order + 1

          and adjacent.start_time =
            v_original.end_time
        )
      )

  )
  then

    raise exception
      'This class is part of a consecutive multi-period session. Use the full timetable builder so the complete session moves together.';

  end if;


  -- ----------------------------------------------------------
  -- Revalidate actual period slot.
  --
  -- If Main Admin changed timetable period configuration after
  -- Faculty submitted the request, do not silently reinterpret
  -- their selected time.
  -- ----------------------------------------------------------

  select
    slot.*

  into
    v_slot

  from
    public.timetable_period_slots slot

  where
    slot.id =
      v_option.period_slot_id

    and slot.is_teaching_slot

    and slot.period_order =
      v_option.period_order

    and slot.start_time =
      v_option.start_time

    and slot.end_time =
      v_option.end_time;


  if
    v_slot.id is null
  then
    raise exception
      'The selected timetable period changed after this request was submitted. Ask the Faculty member to submit a new request.';
  end if;


  -- Slot must still belong to this batch profile.

  if not exists (

    select
      1

    from
      public.timetable_batch_profiles mapping

    where
      mapping.batch_id =
        v_request.batch_id

      and mapping.profile_id =
        v_slot.profile_id

  )
  then
    raise exception
      'The selected period is no longer part of this batch schedule.';
  end if;


  -- Day must still be active.

  if not exists (

    select
      1

    from
      public.timetable_working_days working_day

    where
      working_day.profile_id =
        v_slot.profile_id

      and working_day.day_of_week =
        v_option.day_of_week

      and working_day.is_working_day

  )
  then
    raise exception
      'The selected alternative day is no longer an active working day.';
  end if;


  -- ----------------------------------------------------------
  -- FACULTY COLLISION
  --
  -- Check current Published timetables belonging to OTHER
  -- batches. The affected batch itself is rebuilt below.
  -- ----------------------------------------------------------

  if exists (

    select
      1

    from
      public.batch_timetable_entries existing

    join
      public.timetable_publications publication
        on publication.id =
          existing.publication_id

    where
      existing.faculty_id =
        v_original.faculty_id

      and existing.batch_id <>
        v_original.batch_id

      and publication.status =
        'Published'

      and existing.day_of_week =
        v_option.day_of_week

      and v_slot.start_time <
        existing.end_time

      and v_slot.end_time >
        existing.start_time

  )
  then
    raise exception
      'Faculty conflict: the teacher already has another Published class during this time.';
  end if;


  -- ----------------------------------------------------------
  -- BATCH / SUBGROUP COLLISION INSIDE CURRENT BATCH
  --
  -- Whole-batch classes conflict with everything.
  -- Subgroup classes may coexist only with DIFFERENT subgroups.
  -- ----------------------------------------------------------

  if exists (

    select
      1

    from
      public.batch_timetable_entries existing

    where
      existing.publication_id =
        v_current_publication.id

      and existing.id <>
        v_original.id

      and existing.day_of_week =
        v_option.day_of_week

      and v_slot.start_time <
        existing.end_time

      and v_slot.end_time >
        existing.start_time

      and (

        v_original_subgroup =
          ''

        or

        upper(
          btrim(
            coalesce(
              existing.subgroup,
              ''
            )
          )
        ) =
          ''

        or

        upper(
          btrim(
            coalesce(
              existing.subgroup,
              ''
            )
          )
        ) =
          v_original_subgroup

      )

  )
  then
    raise exception
      'Batch conflict: this batch or subgroup already has another class during the selected time.';
  end if;


  -- ----------------------------------------------------------
  -- RESOURCE COLLISION
  --
  -- Preserve the original room/lab for this move.
  -- ----------------------------------------------------------

  if
    v_original.resource_id is not null

    and exists (

      select
        1

      from
        public.batch_timetable_entries existing

      join
        public.timetable_publications publication
          on publication.id =
            existing.publication_id

      where
        existing.resource_id =
          v_original.resource_id

        and existing.batch_id <>
          v_original.batch_id

        and publication.status =
          'Published'

        and existing.day_of_week =
          v_option.day_of_week

        and v_slot.start_time <
          existing.end_time

        and v_slot.end_time >
          existing.start_time

    )
  then
    raise exception
      'Room or laboratory conflict: the assigned resource is already occupied during this time.';
  end if;


  -- Same resource cannot collide with another subgroup/session
  -- inside the affected batch either.

  if
    v_original.resource_id is not null

    and exists (

      select
        1

      from
        public.batch_timetable_entries existing

      where
        existing.publication_id =
          v_current_publication.id

        and existing.id <>
          v_original.id

        and existing.resource_id =
          v_original.resource_id

        and existing.day_of_week =
          v_option.day_of_week

        and v_slot.start_time <
          existing.end_time

        and v_slot.end_time >
          existing.start_time

    )
  then
    raise exception
      'Room or laboratory conflict: the assigned resource is already used by this batch during the selected time.';
  end if;


  -- Legacy rows may contain a room string without resource_id.
  -- Protect those too when a meaningful room name exists.

  if
    v_original.resource_id is null

    and btrim(
      coalesce(
        v_original.room,
        ''
      )
    ) <>
      ''

    and exists (

      select
        1

      from
        public.batch_timetable_entries existing

      join
        public.timetable_publications publication
          on publication.id =
            existing.publication_id

      where
        existing.id <>
          v_original.id

        and lower(
          btrim(
            coalesce(
              existing.room,
              ''
            )
          )
        ) =
        lower(
          btrim(
            v_original.room
          )
        )

        and publication.status =
          'Published'

        and existing.batch_id <>
          v_original.batch_id

        and existing.day_of_week =
          v_option.day_of_week

        and v_slot.start_time <
          existing.end_time

        and v_slot.end_time >
          existing.start_time

    )
  then
    raise exception
      'Room conflict: the assigned room name is already used during this time.';
  end if;


  -- ----------------------------------------------------------
  -- Legacy named-room collision inside affected batch
  --
  -- Different non-empty subgroups may legitimately run in
  -- parallel, but they still cannot occupy the same physical
  -- room when that room exists only as legacy text and has no
  -- timetable_resources UUID.
  -- ----------------------------------------------------------

  if
    v_original.resource_id is null

    and btrim(
      coalesce(
        v_original.room,
        ''
      )
    ) <>
      ''

    and exists (

      select
        1

      from
        public.batch_timetable_entries existing

      where
        existing.publication_id =
          v_current_publication.id

        and existing.id <>
          v_original.id

        and existing.resource_id is null

        and lower(
          btrim(
            coalesce(
              existing.room,
              ''
            )
          )
        ) =
        lower(
          btrim(
            v_original.room
          )
        )

        and existing.day_of_week =
          v_option.day_of_week

        and v_slot.start_time <
          existing.end_time

        and v_slot.end_time >
          existing.start_time

    )
  then
    raise exception
      'Room conflict: another class in this batch already uses the assigned room during this time.';
  end if;


  -- ----------------------------------------------------------
  -- Version number
  -- ----------------------------------------------------------

  select
    coalesce(
      max(
        publication.version_number
      ),
      0
    ) + 1

  into
    v_next_version

  from
    public.timetable_publications publication

  where
    publication.batch_id =
      v_request.batch_id;


  -- ----------------------------------------------------------
  -- Create new DRAFT publication
  -- ----------------------------------------------------------

  insert into
  public.timetable_publications (

    batch_id,

    version_number,

    status,

    created_by

  )
  values (

    v_request.batch_id,

    v_next_version,

    'Draft',

    auth.uid()

  )
  returning
    id

  into
    v_new_publication_id;


  -- ----------------------------------------------------------
  -- Clone every unaffected entry
  -- ----------------------------------------------------------

  insert into
  public.batch_timetable_entries (

    batch_id,

    batch_subject_id,

    faculty_id,

    faculty_name,

    day_of_week,

    period_order,

    start_time,

    end_time,

    room,

    class_type,

    notes,

    created_by,

    subgroup,

    resource_id,

    publication_id

  )

  select

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

    entry.notes,

    auth.uid(),

    entry.subgroup,

    entry.resource_id,

    v_new_publication_id

  from
    public.batch_timetable_entries entry

  where
    entry.publication_id =
      v_current_publication.id

    and entry.id <>
      v_original.id;


  -- ----------------------------------------------------------
  -- Insert moved replacement class
  -- ----------------------------------------------------------

  insert into
  public.batch_timetable_entries (

    batch_id,

    batch_subject_id,

    faculty_id,

    faculty_name,

    day_of_week,

    period_order,

    start_time,

    end_time,

    room,

    class_type,

    notes,

    created_by,

    subgroup,

    resource_id,

    publication_id

  )
  values (

    v_original.batch_id,

    v_original.batch_subject_id,

    v_original.faculty_id,

    v_original.faculty_name,

    v_option.day_of_week,

    v_slot.period_order,

    v_slot.start_time,

    v_slot.end_time,

    v_original.room,

    v_original.class_type,

    v_original.notes,

    auth.uid(),

    v_original.subgroup,

    v_original.resource_id,

    v_new_publication_id

  );


  -- ----------------------------------------------------------
  -- Defensive count: new version must contain exactly the same
  -- number of periods as the previous version.
  -- ----------------------------------------------------------

  select
    count(*)

  into
    v_entry_count

  from
    public.batch_timetable_entries entry

  where
    entry.publication_id =
      v_new_publication_id;


  if
    v_entry_count <>
    (
      select
        count(*)

      from
        public.batch_timetable_entries entry

      where
        entry.publication_id =
          v_current_publication.id
    )
  then
    raise exception
      'Timetable rebuild failed validation: period count changed unexpectedly.';
  end if;


  -- ----------------------------------------------------------
  -- Atomic publication cutover
  -- ----------------------------------------------------------

  update
    public.timetable_publications

  set
    status =
      'Superseded',

    updated_at =
      now()

  where
    id =
      v_current_publication.id;


  update
    public.timetable_publications

  set
    status =
      'Published',

    published_by =
      auth.uid(),

    published_at =
      now(),

    updated_at =
      now()

  where
    id =
      v_new_publication_id;


  -- ----------------------------------------------------------
  -- Resolve selected request
  -- ----------------------------------------------------------

  update
    public.timetable_change_requests

  set
    status =
      'Rebuilt',

    coordinator_id =
      auth.uid(),

    coordinator_note =
      v_note,

    resolution_publication_id =
      v_new_publication_id,

    resolved_at =
      now(),

    updated_at =
      now()

  where
    id =
      v_request.id;


  -- ----------------------------------------------------------
  -- Other requests based on the now-superseded version are
  -- stale. Close them safely and ask Faculty to review the new
  -- timetable before resubmitting.
  -- ----------------------------------------------------------

  update
    public.timetable_change_requests

  set
    status =
      'Cancelled',

    coordinator_id =
      auth.uid(),

    coordinator_note =
      case

        when
          btrim(
            coalesce(
              coordinator_note,
              ''
            )
          ) =
            ''
        then
          'A newer timetable version was published for this batch. Review the latest timetable and submit a new request if the conflict still exists.'

        else
          coordinator_note ||
          E'\n\n' ||
          'A newer timetable version was published for this batch. Review the latest timetable and submit a new request if the conflict still exists.'

      end,

    resolved_at =
      now(),

    updated_at =
      now()

  where
    batch_id =
      v_request.batch_id

    and publication_id =
      v_current_publication.id

    and id <>
      v_request.id

    and status in (
      'Pending',
      'Reviewing'
    );


  return
    jsonb_build_object(

      'publicationId',
        v_new_publication_id,

      'versionNumber',
        v_next_version,

      'entryCount',
        v_entry_count,

      'requestId',
        v_request.id,

      'status',
        'Rebuilt',

      'movedClass',

        jsonb_build_object(

          'dayOfWeek',
            v_option.day_of_week,

          'periodOrder',
            v_slot.period_order,

          'startTime',
            v_slot.start_time,

          'endTime',
            v_slot.end_time,

          'room',
            v_original.room

        )

    );

end;
$$;


revoke all
on function
public.apply_timetable_change_request(
  uuid,
  uuid,
  text
)
from public, anon;


grant execute
on function
public.apply_timetable_change_request(
  uuid,
  uuid,
  text
)
to authenticated;


comment on function
public.apply_timetable_change_request(
  uuid,
  uuid,
  text
)
is
'Atomically clones the current Published timetable, moves one single-period Faculty-requested class into a validated alternative slot, publishes a new version and marks the request Rebuilt. Department-scoped active Timetable Coordinator only.';




-- ============================================================
-- 19. TIMETABLE V2 — VERSION-AWARE ENTRY VALIDATOR
--
-- Why this replacement exists:
--
-- The legacy validator allowed:
--
--   • attendance_batch_subjects.faculty_id
--   • Main Admin override
--
-- CampusConnect now also supports legitimate Faculty through:
--
--   faculty_teaching_allocations
--
-- Timetable V2 Coordinator rebuilds therefore need to preserve
-- valid primary Faculty AND active co-teacher/lab allocations.
--
-- Collision behavior remains publication-aware:
--
--   • Rows inside the SAME publication are checked together.
--   • Other batches conflict only against their Published
--     timetable.
--   • An older/superseded version of the SAME batch does not
--     collide with the new Draft version being assembled.
--
-- Direct Coordinator table mutation is still blocked by RLS.
-- Coordinator rebuilds happen only through the validated
-- SECURITY DEFINER Timetable V2 RPC.
-- ============================================================

create or replace function
public.validate_batch_timetable_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_subgroup text;

begin

  -- ----------------------------------------------------------
  -- Normalize subgroup
  -- ----------------------------------------------------------

  new.subgroup :=
    upper(
      btrim(
        coalesce(
          new.subgroup,
          ''
        )
      )
    );


  v_subgroup :=
    new.subgroup;


  -- ----------------------------------------------------------
  -- SUBJECT + FACULTY ASSIGNMENT
  --
  -- Valid when:
  --
  --   1. Subject belongs to selected batch, AND
  --
  --   2. Faculty is either:
  --        a. primary subject Faculty
  --        b. active teaching allocation
  --        c. Main Admin override
  --
  -- For subgroup-specific allocations:
  --   blank allocation subgroup = general allocation
  --   nonblank subgroup must match timetable subgroup
  -- ----------------------------------------------------------

  if not exists (

    select
      1

    from
      public.attendance_batch_subjects subject

    where
      subject.id =
        new.batch_subject_id

      and subject.batch_id =
        new.batch_id

      and (

        subject.faculty_id =
          new.faculty_id

        or

        exists (

          select
            1

          from
            public.faculty_teaching_allocations allocation

          where
            allocation.batch_id =
              new.batch_id

            and allocation.batch_subject_id =
              new.batch_subject_id

            and allocation.faculty_id =
              new.faculty_id

            and lower(
              btrim(
                coalesce(
                  allocation.status,
                  ''
                )
              )
            ) =
              'active'

            and (

              upper(
                btrim(
                  coalesce(
                    allocation.subgroup,
                    ''
                  )
                )
              ) =
                ''

              or

              upper(
                btrim(
                  coalesce(
                    allocation.subgroup,
                    ''
                  )
                )
              ) =
                v_subgroup

            )

        )

        or

        public.current_campus_role() =
          'Main Admin'

      )

  )
  then

    raise exception
      'Selected Faculty is not assigned to this batch subject.';

  end if;


  -- ----------------------------------------------------------
  -- BATCH / SUBGROUP COLLISION
  --
  -- Only compare against rows inside the SAME publication.
  --
  -- This is essential for timetable versioning because the old
  -- Published version of this same batch may coexist while a
  -- new Draft version is being built.
  --
  -- Whole-batch class:
  --   conflicts with every overlapping class.
  --
  -- Subgroup class:
  --   conflicts with a whole-batch class or same subgroup.
  -- ----------------------------------------------------------

  if exists (

    select
      1

    from
      public.batch_timetable_entries existing

    where
      existing.publication_id =
        new.publication_id

      and existing.batch_id =
        new.batch_id

      and existing.id <>
        new.id

      and existing.day_of_week =
        new.day_of_week

      and new.start_time <
        existing.end_time

      and new.end_time >
        existing.start_time

      and (

        v_subgroup =
          ''

        or

        upper(
          btrim(
            coalesce(
              existing.subgroup,
              ''
            )
          )
        ) =
          ''

        or

        upper(
          btrim(
            coalesce(
              existing.subgroup,
              ''
            )
          )
        ) =
          v_subgroup

      )

  )
  then

    raise exception
      'This batch or subgroup already has a class during the selected time.';

  end if;


  -- ----------------------------------------------------------
  -- FACULTY COLLISION
  --
  -- Compare against:
  --
  --   • other rows in this SAME publication
  --   • Published timetables belonging to OTHER batches
  --
  -- Do NOT compare a new Draft against the superseded/current
  -- version of its own batch while cloning.
  -- ----------------------------------------------------------

  if exists (

    select
      1

    from
      public.batch_timetable_entries existing

    join
      public.timetable_publications existing_publication
        on existing_publication.id =
          existing.publication_id

    where
      existing.faculty_id =
        new.faculty_id

      and existing.id <>
        new.id

      and existing.day_of_week =
        new.day_of_week

      and new.start_time <
        existing.end_time

      and new.end_time >
        existing.start_time

      and (

        existing.publication_id =
          new.publication_id

        or

        (

          existing.batch_id <>
            new.batch_id

          and existing_publication.status =
            'Published'

        )

      )

  )
  then

    raise exception
      'Faculty already has another class during this time.';

  end if;


  new.updated_at :=
    now();


  return new;

end;
$$;


-- Ensure trigger points to the deterministic latest function.

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


comment on function
public.validate_batch_timetable_entry()
is
'Timetable V2 version-aware validator. Supports primary subject Faculty and active faculty_teaching_allocations while isolating timetable versions and preventing batch/subgroup/faculty collisions.';


notify pgrst, 'reload schema';
