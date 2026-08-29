-- ============================================================
-- CAMPUSCONNECT — SAFE CAMPUS DIRECTORY SEARCH
-- ============================================================

drop function if exists
public.search_campus_directory(text);

create function
public.search_campus_directory(search_term text)
returns table (
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
set search_path = public
as $$
  select
    p.id,
    coalesce(p.full_name, ''),
    coalesce(p.campus_uid, ''),
    coalesce(p.usn, ''),
    coalesce(p.department, ''),
    coalesce(p.graduation_year::text, ''),
    coalesce(p.role::text, ''),
    p.avatar_url
  from public.profiles p
  where
    auth.uid() is not null
    and length(trim(search_term)) >= 2
    and (
      p.campus_uid ilike '%' || trim(search_term) || '%'
      or p.full_name ilike '%' || trim(search_term) || '%'
      or p.usn ilike '%' || trim(search_term) || '%'
      or p.department ilike '%' || trim(search_term) || '%'
    )
  order by

    -- exact Campus UID always first
    case
      when lower(coalesce(p.campus_uid, '')) =
           lower(trim(search_term))
      then 0
      else 1
    end,

    -- UID beginning with query second
    case
      when lower(coalesce(p.campus_uid, ''))
           like lower(trim(search_term)) || '%'
      then 0
      else 1
    end,

    -- then matching names
    case
      when lower(coalesce(p.full_name, ''))
           like lower(trim(search_term)) || '%'
      then 0
      else 1
    end,

    p.full_name asc

  limit 12;
$$;


revoke all
on function public.search_campus_directory(text)
from public;

grant execute
on function public.search_campus_directory(text)
to authenticated;

notify pgrst, 'reload schema';
