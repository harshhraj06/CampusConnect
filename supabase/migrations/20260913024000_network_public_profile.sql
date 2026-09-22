create or replace function public.get_campus_public_profile(
  target_user uuid
)
returns table (
  id uuid,
  full_name text,
  campus_uid text,
  department text,
  graduation_year text,
  role text,
  avatar_url text,
  cover_url text,
  bio text,
  skills text
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
    coalesce(p.department, ''),
    coalesce(p.graduation_year::text, ''),
    coalesce(p.role::text, ''),
    p.avatar_url,
    p.cover_url,
    coalesce(p.bio, ''),
    coalesce(p.skills, '')
  from public.profiles p
  where
    auth.uid() is not null
    and p.id = target_user
  limit 1;
$$;

revoke all
on function public.get_campus_public_profile(uuid)
from public, anon;

grant execute
on function public.get_campus_public_profile(uuid)
to authenticated;

notify pgrst, 'reload schema';
