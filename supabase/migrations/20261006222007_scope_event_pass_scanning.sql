create or replace function public.can_scan_event_pass(
  p_event_id uuid
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
      from public.campus_events event
      where event.id =
        p_event_id
    )

    and (
      coalesce(
        public.current_campus_role()::text,
        ''
      ) = 'Main Admin'

      or exists (
        select 1
        from public.campus_events event
        where
          event.id =
            p_event_id

          and event.created_by =
            auth.uid()
      )

      or public.has_campus_delegated_access(
        'EVENT_SCAN',
        p_event_id
      )
    );
$function$;

revoke execute on function
public.can_scan_event_pass(
  uuid
)
from public, anon;

grant execute on function
public.can_scan_event_pass(
  uuid
)
to authenticated, service_role;

notify pgrst, 'reload schema';
