-- ============================================================
-- CAMPUSCONNECT — COLLEGE ID STUDENT + FACULTY SUPPORT
--
-- Student:
--   USN
--   Campus UID
--   Official physical barcode
--
-- Faculty:
--   Employee ID
--   Campus UID
--
-- Authenticated users only.
-- ============================================================


create or replace function
public.verify_college_id_barcode(
  p_barcode_value text
)
returns table (
  student_id uuid,
  full_name text,
  usn text,
  campus_uid text,
  department text,
  graduation_year text,
  avatar_url text,
  role text,
  verified boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare

  clean_identity text;

begin


  if auth.uid() is null then

    raise exception
      'Authentication required.';

  end if;


  clean_identity :=
    upper(
      trim(
        coalesce(
          p_barcode_value,
          ''
        )
      )
    );


  if length(clean_identity) < 2 then
    return;
  end if;



  return query


  select

    p.id,


    p.full_name,


    /*
     * Keep the existing frontend return contract.
     *
     * For Students this remains USN.
     * For Faculty the same returned field carries
     * the authoritative Employee ID.
     */
    case

      when p.role::text = 'Faculty'
      then
        coalesce(
          nullif(
            trim(
              p.employee_id
            ),
            ''
          ),
          nullif(
            trim(
              p.usn
            ),
            ''
          ),
          ''
        )

      else
        coalesce(
          p.usn,
          ''
        )

    end,


    coalesce(
      p.campus_uid,
      ''
    ),


    coalesce(
      p.department,
      ''
    ),


    case

      when p.role::text = 'Student'
      then
        coalesce(
          p.graduation_year,
          ''
        )

      else
        ''

    end,


    p.avatar_url,


    p.role::text,


    true


  from
    public.profiles p


  left join
    public.college_id_barcode_mappings m

    on
      m.student_id =
        p.id

      and
      m.is_active =
        true


  where

    coalesce(
      p.account_status,
      'Active'
    ) = 'Active'


    and

    p.role::text in (
      'Student',
      'Faculty'
    )


    and (

      /*
       * STUDENT LOOKUP
       */
      (

        p.role::text =
          'Student'

        and (

          upper(
            trim(
              coalesce(
                p.usn,
                ''
              )
            )
          ) =
            clean_identity


          or


          upper(
            trim(
              coalesce(
                p.campus_uid,
                ''
              )
            )
          ) =
            clean_identity


          or


          upper(
            trim(
              coalesce(
                m.barcode_value,
                ''
              )
            )
          ) =
            clean_identity

        )

      )


      or


      /*
       * FACULTY LOOKUP
       */
      (

        p.role::text =
          'Faculty'

        and (

          upper(
            trim(
              coalesce(
                p.employee_id,
                ''
              )
            )
          ) =
            clean_identity


          or


          /*
           * Compatibility fallback for Faculty records
           * created before employee_id became authoritative.
           */
          (

            nullif(
              trim(
                coalesce(
                  p.employee_id,
                  ''
                )
              ),
              ''
            ) is null

            and

            upper(
              trim(
                coalesce(
                  p.usn,
                  ''
                )
              )
            ) =
              clean_identity

          )


          or


          upper(
            trim(
              coalesce(
                p.campus_uid,
                ''
              )
            )
          ) =
            clean_identity

        )

      )

    )


  limit 1;

end;
$$;



revoke all
on function
public.verify_college_id_barcode(
  text
)
from public,
     anon;


grant execute
on function
public.verify_college_id_barcode(
  text
)
to authenticated;


notify pgrst,
  'reload schema';
