-- Restrict secure event check-in to operational scanner roles.
-- Faculty, Placement Cell, Students and event creators are excluded.

begin;


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
    and coalesce(
      public.current_campus_role()::text,
      ''
    ) in (
      'Volunteer',
      'Coordinator',
      'Main Admin'
    )
    and exists (
      select 1
      from public.campus_events event
      where event.id = p_event_id
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


drop policy if exists
  "event_pass_scans_authorized_read"
on public.event_pass_scans;


create policy
  "event_pass_scans_authorized_read"
on public.event_pass_scans
for select
to authenticated
using (
  scanned_by = auth.uid()

  or exists (
    select 1
    from public.event_registrations registration
    where
      registration.id =
        event_pass_scans.registration_id
      and registration.student_id =
        auth.uid()
  )

  or coalesce(
    public.current_campus_role()::text,
    ''
  ) in (
    'Volunteer',
    'Coordinator',
    'Main Admin'
  )
);


commit;

notify pgrst, 'reload schema';
