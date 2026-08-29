-- ============================================================
-- CAMPUSCONNECT
-- FACULTY EXCEL IMPORT — LEADERSHIP SUPPORT
-- ============================================================

create or replace function public.bulk_import_faculty(
  rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

  v_leadership_role text;
  v_domain text;
  v_leadership_priority integer;
  v_is_hod boolean;

begin

  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;


  if public.current_campus_role() <> 'Main Admin' then
    raise exception 'Only Main Admin can import faculty records.';
  end if;


  if rows is null
     or jsonb_typeof(rows) <> 'array'
  then
    raise exception 'Faculty import must be a JSON array.';
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


    v_is_hod :=
      coalesce(
        nullif(
          item ->> 'is_hod',
          ''
        )::boolean,
        false
      );


    v_domain :=
      nullif(
        trim(
          coalesce(
            item ->> 'domain',
            ''
          )
        ),
        ''
      );


    v_leadership_role :=
      trim(
        coalesce(
          item ->> 'leadership_role',
          ''
        )
      );


    -- --------------------------------------------------------
    -- LEGACY COMPATIBILITY
    -- --------------------------------------------------------

    if v_leadership_role = '' then

      if v_is_hod then
        v_leadership_role := 'HOD';
      else
        v_leadership_role := 'Faculty';
      end if;

    end if;


    if v_leadership_role not in (
      'Dean',
      'HOD',
      'Domain Head',
      'Program Coordinator',
      'Faculty'
    ) then
      v_leadership_role := 'Faculty';
    end if;


    -- HOD stays compatible with existing UI/database field
    v_is_hod :=
      (
        v_leadership_role = 'HOD'
        or v_is_hod
      );


    v_leadership_priority :=
      coalesce(
        nullif(
          item ->> 'leadership_priority',
          ''
        )::integer,

        case
          when v_leadership_role = 'Dean'
            then 10

          when v_leadership_role = 'HOD'
            then 20

          when v_leadership_role = 'Domain Head'
            then 30

          when v_leadership_role = 'Program Coordinator'
            then 40

          else 100
        end
      );


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


    -- ========================================================
    -- FIND EXISTING RECORD
    -- ========================================================

    if v_email <> '' then

      select id
      into existing_id
      from public.campus_faculty
      where lower(email) = v_email
      limit 1;

    end if;


    if existing_id is null then

      select id
      into existing_id
      from public.campus_faculty
      where
        lower(full_name) =
          lower(v_name)

        and upper(department) =
          v_department
      limit 1;

    end if;


    -- ========================================================
    -- UPDATE
    -- ========================================================

    if existing_id is not null then

      update public.campus_faculty
      set
        full_name =
          v_name,

        department =
          v_department,

        designation =
          v_designation,

        qualification =
          trim(
            coalesce(
              item ->> 'qualification',
              ''
            )
          ),

        specialization =
          trim(
            coalesce(
              item ->> 'specialization',
              ''
            )
          ),

        experience =
          trim(
            coalesce(
              item ->> 'experience',
              ''
            )
          ),

        bio =
          trim(
            coalesce(
              item ->> 'bio',
              ''
            )
          ),

        email =
          v_email,

        photo_url =
          nullif(
            trim(
              coalesce(
                item ->> 'photo_url',
                ''
              )
            ),
            ''
          ),

        profile_url =
          nullif(
            trim(
              coalesce(
                item ->> 'profile_url',
                ''
              )
            ),
            ''
          ),

        is_hod =
          v_is_hod,

        is_featured =
          coalesce(
            nullif(
              item ->> 'is_featured',
              ''
            )::boolean,
            false
          ),

        leadership_role =
          v_leadership_role,

        domain =
          v_domain,

        leadership_priority =
          v_leadership_priority,

        display_order =
          coalesce(
            nullif(
              item ->> 'display_order',
              ''
            )::integer,
            100
          ),

        status =
          case
            when
              item ->> 'status'
              in (
                'Active',
                'Inactive'
              )
            then
              item ->> 'status'

            else
              'Active'
          end,

        updated_at =
          now()

      where
        id =
          existing_id;


      updated_count :=
        updated_count + 1;


    -- ========================================================
    -- INSERT
    -- ========================================================

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
        leadership_role,
        domain,
        leadership_priority,
        display_order,
        status,
        created_by
      )
      values (
        v_name,
        v_department,
        v_designation,

        trim(
          coalesce(
            item ->> 'qualification',
            ''
          )
        ),

        trim(
          coalesce(
            item ->> 'specialization',
            ''
          )
        ),

        trim(
          coalesce(
            item ->> 'experience',
            ''
          )
        ),

        trim(
          coalesce(
            item ->> 'bio',
            ''
          )
        ),

        v_email,

        nullif(
          trim(
            coalesce(
              item ->> 'photo_url',
              ''
            )
          ),
          ''
        ),

        nullif(
          trim(
            coalesce(
              item ->> 'profile_url',
              ''
            )
          ),
          ''
        ),

        v_is_hod,

        coalesce(
          nullif(
            item ->> 'is_featured',
            ''
          )::boolean,
          false
        ),

        v_leadership_role,
        v_domain,
        v_leadership_priority,

        coalesce(
          nullif(
            item ->> 'display_order',
            ''
          )::integer,
          100
        ),

        case
          when
            item ->> 'status'
            in (
              'Active',
              'Inactive'
            )
          then
            item ->> 'status'

          else
            'Active'
        end,

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
$$;


revoke all
on function public.bulk_import_faculty(jsonb)
from public;


grant execute
on function public.bulk_import_faculty(jsonb)
to authenticated;


notify pgrst, 'reload schema';
