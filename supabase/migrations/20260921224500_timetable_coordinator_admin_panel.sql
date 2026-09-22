-- ============================================================
-- CAMPUSCONNECT — TIMETABLE COORDINATOR ADMIN PANEL
--
-- Main Admin only:
--
--   • View departments eligible for timetable coordination
--   • View users whose CampusConnect role is Coordinator
--   • View active timetable coordinator assignments
--   • Assign / replace coordinator for a department
--   • Unassign coordinator without deleting history
--
-- Coordinator timetable authority remains department scoped.
-- ============================================================


-- ============================================================
-- 1. MAIN ADMIN READ MODEL
-- ============================================================

create or replace function
public.get_timetable_coordinator_admin_panel()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare

  v_result jsonb;

begin

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  if public.current_campus_role() <>
    'Main Admin'
  then
    raise exception
      'Main Admin permission required.';
  end if;


  select
    jsonb_build_object(

      'departments',

        coalesce(
          (
            select
              jsonb_agg(
                source.department
                order by
                  source.department
              )

            from (

              select distinct
                btrim(batch.department)
                  as department

              from
                public.attendance_batches batch

              where
                btrim(
                  coalesce(
                    batch.department,
                    ''
                  )
                ) <> ''


              union


              select distinct
                btrim(profile.department)
                  as department

              from
                public.timetable_scheduling_profiles profile

              where
                btrim(
                  coalesce(
                    profile.department,
                    ''
                  )
                ) <> ''

            ) source
          ),

          '[]'::jsonb
        ),


      'coordinators',

        coalesce(
          (
            select
              jsonb_agg(

                jsonb_build_object(

                  'id',
                    profile.id,

                  'fullName',
                    coalesce(
                      profile.full_name,
                      ''
                    ),

                  'email',
                    coalesce(
                      profile.email,
                      ''
                    ),

                  'department',
                    coalesce(
                      profile.department,
                      ''
                    ),

                  'campusUid',
                    coalesce(
                      profile.campus_uid,
                      ''
                    )

                )

                order by
                  lower(
                    coalesce(
                      profile.full_name,
                      profile.email,
                      ''
                    )
                  )

              )

            from
              public.profiles profile

            where
              profile.role =
                'Coordinator'
          ),

          '[]'::jsonb
        ),


      'assignments',

        coalesce(
          (
            select
              jsonb_agg(

                jsonb_build_object(

                  'id',
                    assignment.id,

                  'department',
                    assignment.department,

                  'coordinatorId',
                    assignment.coordinator_id,

                  'coordinatorName',
                    coalesce(
                      profile.full_name,
                      ''
                    ),

                  'coordinatorEmail',
                    coalesce(
                      profile.email,
                      ''
                    ),

                  'assignedAt',
                    assignment.assigned_at,

                  'assignedBy',
                    assignment.assigned_by

                )

                order by
                  assignment.department

              )

            from
              public.timetable_coordinator_assignments assignment

            left join
              public.profiles profile
                on profile.id =
                  assignment.coordinator_id

            where
              assignment.is_active
          ),

          '[]'::jsonb
        )

    )

  into
    v_result;


  return v_result;

end;
$$;


revoke all
on function
public.get_timetable_coordinator_admin_panel()
from public, anon;


grant execute
on function
public.get_timetable_coordinator_admin_panel()
to authenticated;



-- ============================================================
-- 2. MAIN ADMIN ASSIGN / UNASSIGN API
--
-- p_coordinator_id:
--
--   UUID  -> assign or replace
--   NULL  -> deactivate current assignment
--
-- Existing assignment rows are never deleted.
-- ============================================================

create or replace function
public.set_timetable_coordinator_assignment(

  p_department text,

  p_coordinator_id uuid
    default null

)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_requested_department text;

  v_department text;

  v_coordinator_name text;

begin

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  if public.current_campus_role() <>
    'Main Admin'
  then
    raise exception
      'Main Admin permission required.';
  end if;


  v_requested_department :=
    btrim(
      coalesce(
        p_department,
        ''
      )
    );


  if v_requested_department = '' then
    raise exception
      'Department is required.';
  end if;


  -- Resolve against real CampusConnect department data.

  select
    source.department

  into
    v_department

  from (

    select distinct
      btrim(batch.department)
        as department,
      1 as priority

    from
      public.attendance_batches batch

    where
      btrim(
        coalesce(
          batch.department,
          ''
        )
      ) <> ''


    union


    select distinct
      btrim(profile.department)
        as department,
      2 as priority

    from
      public.timetable_scheduling_profiles profile

    where
      btrim(
        coalesce(
          profile.department,
          ''
        )
      ) <> ''

  ) source

  where
    lower(
      source.department
    ) =
    lower(
      v_requested_department
    )

  order by
    source.priority

  limit 1;


  if v_department is null then
    raise exception
      'Department was not found in CampusConnect academic configuration.';
  end if;


  -- ----------------------------------------------------------
  -- UNASSIGN
  -- ----------------------------------------------------------

  if p_coordinator_id is null then

    update
      public.timetable_coordinator_assignments

    set
      is_active =
        false,

      updated_at =
        now()

    where
      is_active

      and lower(
        btrim(
          department
        )
      ) =
      lower(
        v_department
      );


    return
      jsonb_build_object(

        'department',
          v_department,

        'assigned',
          false

      );

  end if;


  -- ----------------------------------------------------------
  -- ASSIGN
  -- ----------------------------------------------------------

  select
    coalesce(
      profile.full_name,
      profile.email,
      'Coordinator'
    )

  into
    v_coordinator_name

  from
    public.profiles profile

  where
    profile.id =
      p_coordinator_id

    and profile.role =
      'Coordinator';


  if v_coordinator_name is null then
    raise exception
      'Selected account does not have the Coordinator role.';
  end if;


  -- Reuse the audited V2 assignment authority rather than
  -- duplicating its replacement rules.

  perform
    public.assign_timetable_coordinator(
      v_department,
      p_coordinator_id
    );


  return
    jsonb_build_object(

      'department',
        v_department,

      'assigned',
        true,

      'coordinatorId',
        p_coordinator_id,

      'coordinatorName',
        v_coordinator_name

    );

end;
$$;


revoke all
on function
public.set_timetable_coordinator_assignment(
  text,
  uuid
)
from public, anon;


grant execute
on function
public.set_timetable_coordinator_assignment(
  text,
  uuid
)
to authenticated;


comment on function
public.get_timetable_coordinator_admin_panel()
is
'Main Admin-only read model for timetable coordinator assignment management.';


comment on function
public.set_timetable_coordinator_assignment(
  text,
  uuid
)
is
'Main Admin-only assign, replace or deactivate Timetable Coordinator authority for a department.';


notify pgrst,
  'reload schema';
