create or replace function public.list_campus_network_profiles()
returns table (
  id uuid,
  full_name text,
  campus_uid text,
  department text,
  graduation_year text,
  role text,
  avatar_url text,
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
    coalesce(p.bio, ''),
    coalesce(p.skills, '')
  from public.profiles p
  where
    auth.uid() is not null
    and p.id <> auth.uid()
  order by
    case
      when coalesce(p.full_name, '') = '' then 1
      else 0
    end,
    p.full_name asc
  limit 100;
$$;

revoke all
on function public.list_campus_network_profiles()
from public, anon;

grant execute
on function public.list_campus_network_profiles()
to authenticated;

notify pgrst, 'reload schema';
