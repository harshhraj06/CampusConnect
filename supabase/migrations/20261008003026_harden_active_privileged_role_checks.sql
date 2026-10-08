create or replace function public.current_campus_role()
returns text
language sql
stable
security definer
set search_path to
  'pg_catalog',
  'public'
as $function$
  select
    profile.role::text
  from public.profiles profile
  where
    profile.id = auth.uid()
    and coalesce(
      profile.account_status::text,
      'Active'
    ) = 'Active'
  limit 1;
$function$;


create or replace function public.assign_timetable_coordinator(
  p_department text,
  p_coordinator_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_department text;
  v_assignment_id uuid;
  v_target_role text;
begin
  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;

  if public.current_campus_role() <>
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
    char_length(v_department) < 2
    or char_length(v_department) > 80
  then
    raise exception
      'A valid department is required.';
  end if;

  select
    profile.role::text
  into
    v_target_role
  from public.profiles profile
  where
    profile.id = p_coordinator_id
    and coalesce(
      profile.account_status::text,
      'Active'
    ) = 'Active';

  if
    v_target_role is distinct from
      'Coordinator'
  then
    raise exception
      'The selected user must be an active Coordinator.';
  end if;

  update
    public.timetable_coordinator_assignments
  set
    is_active = false,
    updated_at = now()
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
$function$;


create or replace function public.set_timetable_coordinator_assignment(
  p_department text,
  p_coordinator_id uuid default null::uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
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
    lower(source.department) =
    lower(v_requested_department)
  order by
    source.priority
  limit 1;

  if v_department is null then
    raise exception
      'Department was not found in CampusConnect academic configuration.';
  end if;

  if p_coordinator_id is null then
    update
      public.timetable_coordinator_assignments
    set
      is_active = false,
      updated_at = now()
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
    and profile.role::text =
      'Coordinator'
    and coalesce(
      profile.account_status::text,
      'Active'
    ) = 'Active';

  if v_coordinator_name is null then
    raise exception
      'Selected account is not an active Coordinator.';
  end if;

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
$function$;


create or replace function public.bulk_import_faculty(
  rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to
  'pg_catalog',
  'public'
as $function$
declare
  item jsonb;
  existing_id uuid;

  inserted_count integer := 0;
  updated_count integer := 0;
  skipped_count integer := 0;

  v_name text;
  v_department text;
  v_designation text;
  v_email text;
begin
  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;

  if public.current_campus_role()
     not in (
       'Coordinator',
       'Main Admin'
     )
  then
    raise exception
      'Only Coordinator or Main Admin can import faculty records.';
  end if;

  if
    rows is null
    or jsonb_typeof(rows) <> 'array'
  then
    raise exception
      'Faculty import must be a JSON array.';
  end if;

  if jsonb_array_length(rows) > 500 then
    raise exception
      'Faculty import is limited to 500 records per request.';
  end if;

  for item in
    select value
    from jsonb_array_elements(rows)
  loop
    v_name :=
      trim(
        coalesce(
          item ->> 'full_name',
          ''
        )
      );

    v_department :=
      upper(
        trim(
          coalesce(
            item ->> 'department',
            ''
          )
        )
      );

    v_designation :=
      trim(
        coalesce(
          item ->> 'designation',
          ''
        )
      );

    v_email :=
      lower(
        trim(
          coalesce(
            item ->> 'email',
            ''
          )
        )
      );

    if
      length(v_name) > 160
      or length(v_department) > 80
      or length(v_designation) > 120
      or length(v_email) > 254
    then
      skipped_count :=
        skipped_count + 1;

      continue;
    end if;

    if
      v_name = ''
      or v_department = ''
      or v_designation = ''
    then
      skipped_count :=
        skipped_count + 1;

      continue;
    end if;

    existing_id := null;

    if v_email <> '' then
      select
        id
      into
        existing_id
      from
        public.campus_faculty
      where
        lower(email) =
          v_email
      limit 1;
    end if;

    if existing_id is null then
      select
        id
      into
        existing_id
      from
        public.campus_faculty
      where
        lower(full_name) =
          lower(v_name)
        and upper(department) =
          v_department
      limit 1;
    end if;

    if existing_id is not null then
      update public.campus_faculty
      set
        full_name =
          v_name,

        department =
          v_department,

        designation =
          case
            when coalesce(
              (item ->> 'is_hod')::boolean,
              false
            )
            then 'HOD'
            else v_designation
          end,

        qualification =
          left(
            trim(
              coalesce(
                item ->> 'qualification',
                ''
              )
            ),
            250
          ),

        specialization =
          left(
            trim(
              coalesce(
                item ->> 'specialization',
                ''
              )
            ),
            250
          ),

        experience =
          left(
            trim(
              coalesce(
                item ->> 'experience',
                ''
              )
            ),
            250
          ),

        bio =
          left(
            trim(
              coalesce(
                item ->> 'bio',
                ''
              )
            ),
            4000
          ),

        email =
          v_email,

        photo_url =
          nullif(
            left(
              trim(
                coalesce(
                  item ->> 'photo_url',
                  ''
                )
              ),
              2000
            ),
            ''
          ),

        profile_url =
          nullif(
            left(
              trim(
                coalesce(
                  item ->> 'profile_url',
                  ''
                )
              ),
              2000
            ),
            ''
          ),

        is_hod =
          coalesce(
            (item ->> 'is_hod')::boolean,
            false
          ),

        is_featured =
          coalesce(
            (item ->> 'is_featured')::boolean,
            false
          ),

        display_order =
          coalesce(
            nullif(
              item ->> 'display_order',
              ''
            )::integer,
            100
          ),

        leadership_role =
          left(
            coalesce(
              nullif(
                trim(
                  item ->>
                    'leadership_role'
                ),
                ''
              ),
              case
                when coalesce(
                  (item ->> 'is_hod')::boolean,
                  false
                )
                then 'HOD'
                else 'Faculty'
              end
            ),
            120
          ),

        domain =
          nullif(
            left(
              trim(
                coalesce(
                  item ->> 'domain',
                  ''
                )
              ),
              250
            ),
            ''
          ),

        leadership_priority =
          coalesce(
            nullif(
              item ->> 'leadership_priority',
              ''
            )::integer,
            100
          ),

        status =
          'Active'
      where
        id =
          existing_id;

      updated_count :=
        updated_count + 1;

    else
      insert into public.campus_faculty (
        full_name,
        department,
        designation,
        qualification,
        specialization,
        experience,
        bio,
        email,
        photo_url,
        profile_url,
        is_hod,
        is_featured,
        display_order,
        leadership_role,
        domain,
        leadership_priority,
        status,
        created_by
      )
      values (
        v_name,
        v_department,

        case
          when coalesce(
            (item ->> 'is_hod')::boolean,
            false
          )
          then 'HOD'
          else v_designation
        end,

        left(
          trim(
            coalesce(
              item ->> 'qualification',
              ''
            )
          ),
          250
        ),

        left(
          trim(
            coalesce(
              item ->> 'specialization',
              ''
            )
          ),
          250
        ),

        left(
          trim(
            coalesce(
              item ->> 'experience',
              ''
            )
          ),
          250
        ),

        left(
          trim(
            coalesce(
              item ->> 'bio',
              ''
            )
          ),
          4000
        ),

        v_email,

        nullif(
          left(
            trim(
              coalesce(
                item ->> 'photo_url',
                ''
              )
            ),
            2000
          ),
          ''
        ),

        nullif(
          left(
            trim(
              coalesce(
                item ->> 'profile_url',
                ''
              )
            ),
            2000
          ),
          ''
        ),

        coalesce(
          (item ->> 'is_hod')::boolean,
          false
        ),

        coalesce(
          (item ->> 'is_featured')::boolean,
          false
        ),

        coalesce(
          nullif(
            item ->> 'display_order',
            ''
          )::integer,
          100
        ),

        left(
          coalesce(
            nullif(
              trim(
                item ->>
                  'leadership_role'
              ),
              ''
            ),
            case
              when coalesce(
                (item ->> 'is_hod')::boolean,
                false
              )
              then 'HOD'
              else 'Faculty'
            end
          ),
          120
        ),

        nullif(
          left(
            trim(
              coalesce(
                item ->> 'domain',
                ''
              )
            ),
            250
          ),
          ''
        ),

        coalesce(
          nullif(
            item ->> 'leadership_priority',
            ''
          )::integer,
          100
        ),

        'Active',

        auth.uid()
      );

      inserted_count :=
        inserted_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'inserted',
      inserted_count,
    'updated',
      updated_count,
    'skipped',
      skipped_count,
    'processed',
      inserted_count +
      updated_count +
      skipped_count
  );
end;
$function$;


revoke execute on function
public.current_campus_role()
from public, anon;

grant execute on function
public.current_campus_role()
to authenticated, service_role;

notify pgrst, 'reload schema';
