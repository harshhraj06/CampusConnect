create or replace function public.search_campus_directory(
  search_term text
)
returns table(
  id uuid,
  full_name text,
  campus_uid text,
  usn text,
  department text,
  graduation_year text,
  role text,
  avatar_url text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    p.id,

    coalesce(
      p.full_name,
      ''
    ),

    coalesce(
      p.campus_uid,
      ''
    ),

    ''::text as usn,

    coalesce(
      p.department,
      ''
    ),

    coalesce(
      p.graduation_year::text,
      ''
    ),

    coalesce(
      p.role::text,
      ''
    ),

    p.avatar_url

  from
    public.profiles p

  where
    auth.uid() is not null

    and length(
      trim(
        search_term
      )
    ) >= 2

    and (
      p.campus_uid ilike
        '%' || trim(search_term) || '%'

      or p.full_name ilike
        '%' || trim(search_term) || '%'

      or p.department ilike
        '%' || trim(search_term) || '%'
    )

  order by

    case
      when lower(
        coalesce(
          p.campus_uid,
          ''
        )
      ) =
      lower(
        trim(
          search_term
        )
      )
      then 0
      else 1
    end,

    case
      when lower(
        coalesce(
          p.campus_uid,
          ''
        )
      )
      like
        lower(
          trim(
            search_term
          )
        ) || '%'
      then 0
      else 1
    end,

    case
      when lower(
        coalesce(
          p.full_name,
          ''
        )
      )
      like
        lower(
          trim(
            search_term
          )
        ) || '%'
      then 0
      else 1
    end,

    p.full_name asc

  limit 12;
$function$;

revoke execute on function public.search_campus_directory(
  text
) from public, anon;

grant execute on function public.search_campus_directory(
  text
) to authenticated;

notify pgrst, 'reload schema';
