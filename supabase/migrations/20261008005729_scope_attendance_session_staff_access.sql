create or replace function public.attendance_staff_can_read_session(
  target_session uuid
)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.attendance_sessions session
    where
      session.id = target_session
      and (
        public.current_campus_role() =
          'Main Admin'

        or (
          public.current_campus_role() =
            'Faculty'
          and session.faculty_id =
            auth.uid()
        )

        or (
          public.current_campus_role() =
            'Coordinator'
          and exists (
            select 1
            from public.attendance_batches batch
            where
              batch.id =
                session.batch_id
              and public.is_timetable_coordinator_for_department(
                batch.department
              )
          )
        )
      )
  );
$function$;


create or replace function public.attendance_staff_can_manage_session(
  target_session uuid
)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.attendance_sessions session
    where
      session.id = target_session
      and (
        public.current_campus_role() =
          'Main Admin'

        or (
          public.current_campus_role() =
            'Faculty'
          and session.faculty_id =
            auth.uid()
        )

        or (
          public.current_campus_role() =
            'Coordinator'
          and exists (
            select 1
            from public.attendance_batches batch
            where
              batch.id =
                session.batch_id
              and public.is_timetable_coordinator_for_department(
                batch.department
              )
          )
        )
      )
  );
$function$;


revoke execute on function
public.attendance_staff_can_read_session(uuid)
from public, anon;

revoke execute on function
public.attendance_staff_can_manage_session(uuid)
from public, anon;

grant execute on function
public.attendance_staff_can_read_session(uuid)
to authenticated, service_role;

grant execute on function
public.attendance_staff_can_manage_session(uuid)
to authenticated, service_role;

notify pgrst, 'reload schema';
