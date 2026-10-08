create or replace function public.campus_service_current_role()
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
  from public.profiles
    as profile
  where
    profile.id =
      auth.uid()

    and coalesce(
      profile.account_status::text,
      'Active'
    ) = 'Active'
  limit 1;
$function$;

revoke execute on function
public.campus_service_current_role()
from public, anon;

grant execute on function
public.campus_service_current_role()
to authenticated, service_role;

notify pgrst, 'reload schema';
