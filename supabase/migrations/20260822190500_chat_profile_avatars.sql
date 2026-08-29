-- =========================================================
-- CAMPUSCONNECT CHAT USER PROFILE AVATARS
-- =========================================================

-- ---------------------------------------------------------
-- Find multiple campus users
-- Used by:
-- Friends
-- Requests
-- Sent
-- Group members
-- Direct conversation peer lookup
-- ---------------------------------------------------------

drop function if exists
public.find_campus_users_by_ids(uuid[]);

create function public.find_campus_users_by_ids(
  user_ids uuid[]
)
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  department text,
  graduation_year text,
  campus_uid text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.department,
    p.graduation_year,
    p.campus_uid,
    p.avatar_url
  from public.profiles p
  where p.id = any(user_ids);
$$;

revoke all
on function public.find_campus_users_by_ids(uuid[])
from public;

grant execute
on function public.find_campus_users_by_ids(uuid[])
to authenticated;


-- ---------------------------------------------------------
-- Find one CampusConnect user by UID
-- Used by New Chat / UID lookup
-- ---------------------------------------------------------

drop function if exists
public.find_campus_user_by_uid(text);

create function public.find_campus_user_by_uid(
  lookup_uid text
)
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  department text,
  graduation_year text,
  campus_uid text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.department,
    p.graduation_year,
    p.campus_uid,
    p.avatar_url
  from public.profiles p
  where upper(p.campus_uid) =
        upper(trim(lookup_uid))
  limit 1;
$$;

revoke all
on function public.find_campus_user_by_uid(text)
from public;

grant execute
on function public.find_campus_user_by_uid(text)
to authenticated;
