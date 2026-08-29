-- ============================================================
-- ALLOW COORDINATOR TO USE FACULTY EXCEL IMPORT
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

begin

  if auth.uid() is null then
    raise exception 'Authentication required.';
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


  if rows is null
     or jsonb_typeof(rows) <> 'array'
  then
    raise exception
      'Faculty import must be a JSON array.';
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

      select id
      into existing_id
      from public.campus_faculty
      where lower(email) =
        v_email
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
          coalesce(
            nullif(
              trim(
                item ->> 'leadership_role'
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

        domain =
          nullif(
            trim(
              coalesce(
                item ->> 'domain',
                ''
              )
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

      where id =
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

        coalesce(
          nullif(
            trim(
              item ->> 'leadership_role'
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

        nullif(
          trim(
            coalesce(
              item ->> 'domain',
              ''
            )
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
$$;


revoke all
on function public.bulk_import_faculty(jsonb)
from public;


grant execute
on function public.bulk_import_faculty(jsonb)
to authenticated;


notify pgrst, 'reload schema';
