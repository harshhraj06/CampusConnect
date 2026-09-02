-- Allow CampusConnect operational roles to scan event passes.

create or replace function
  public.can_scan_event_pass(
    p_event_id uuid
  )
returns boolean
language sql
stable
security definer
set search_path =
  pg_catalog,
  public
as $$
  select
    auth.uid() is not null
    and (
      coalesce(
        public.current_campus_role()::text,
        ''
      ) in (
        'Faculty',
        'Coordinator',
        'Volunteer',
        'Placement Cell',
        'Main Admin'
      )

      or exists (
        select 1
        from public.campus_events event
        where
          event.id = p_event_id
          and event.created_by =
            auth.uid()
      )
    );
$$;

revoke all
on function
  public.can_scan_event_pass(uuid)
from public, anon;

grant execute
on function
  public.can_scan_event_pass(uuid)
to authenticated;

notify pgrst, 'reload schema';
