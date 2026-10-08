create or replace function public.campus_service_can_process_request(
  p_request_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to
  'pg_catalog',
  'public'
as $function$
  select
    auth.uid() is not null

    and exists (
      select 1
      from public.campus_service_requests
        as request
      where
        request.id =
          p_request_id

        and (
          public.campus_service_current_role() =
            'Main Admin'

          or request.assigned_to =
            auth.uid()

          or (
            request.assigned_to is null

            and request.assigned_role =
              public.campus_service_current_role()

            and public.campus_service_current_role()
              in (
                'Faculty',
                'Placement Cell',
                'Coordinator',
                'Volunteer'
              )
          )

          or public.has_campus_delegated_access(
            'SEVA_PROCESS',
            request.id
          )
        )
    );
$function$;

revoke execute on function
public.campus_service_can_process_request(
  uuid
)
from public, anon;

grant execute on function
public.campus_service_can_process_request(
  uuid
)
to authenticated, service_role;

notify pgrst, 'reload schema';
