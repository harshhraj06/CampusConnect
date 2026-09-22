create or replace function public.attendance_staff_can_read_session(
  target_session uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.attendance_sessions s
    where s.id = target_session
      and (
        s.faculty_id = (select auth.uid())
        or (select public.current_campus_role()) in (
          'Faculty',
          'Coordinator',
          'Main Admin'
        )
      )
  );
$$;


create or replace function public.attendance_staff_can_manage_session(
  target_session uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.attendance_sessions s
    where s.id = target_session
      and (
        s.faculty_id = (select auth.uid())
        or (select public.current_campus_role()) in (
          'Coordinator',
          'Main Admin'
        )
      )
  );
$$;


create or replace function public.attendance_current_student_in_session(
  target_session uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.attendance_session_entries e
    where e.session_id = target_session
      and e.student_id = (select auth.uid())
  );
$$;


revoke all
on function public.attendance_staff_can_read_session(uuid)
from public, anon;

revoke all
on function public.attendance_staff_can_manage_session(uuid)
from public, anon;

revoke all
on function public.attendance_current_student_in_session(uuid)
from public, anon;


grant execute
on function public.attendance_staff_can_read_session(uuid)
to authenticated;

grant execute
on function public.attendance_staff_can_manage_session(uuid)
to authenticated;

grant execute
on function public.attendance_current_student_in_session(uuid)
to authenticated;


drop policy if exists
"Staff read attendance sessions"
on public.attendance_sessions;

create policy
"Staff read attendance sessions"
on public.attendance_sessions
for select
to authenticated
using (
  public.attendance_staff_can_read_session(id)
  or
  public.attendance_current_student_in_session(id)
);


drop policy if exists
"Attendance entries readable"
on public.attendance_session_entries;

create policy
"Attendance entries readable"
on public.attendance_session_entries
for select
to authenticated
using (
  student_id = (select auth.uid())
  or
  public.attendance_staff_can_read_session(session_id)
);


drop policy if exists
"Staff create attendance entries"
on public.attendance_session_entries;

create policy
"Staff create attendance entries"
on public.attendance_session_entries
for insert
to authenticated
with check (
  public.attendance_staff_can_manage_session(session_id)
);


drop policy if exists
"Staff update attendance entries"
on public.attendance_session_entries;

create policy
"Staff update attendance entries"
on public.attendance_session_entries
for update
to authenticated
using (
  public.attendance_staff_can_manage_session(session_id)
)
with check (
  public.attendance_staff_can_manage_session(session_id)
);


drop policy if exists
"Staff delete attendance entries"
on public.attendance_session_entries;

create policy
"Staff delete attendance entries"
on public.attendance_session_entries
for delete
to authenticated
using (
  public.attendance_staff_can_manage_session(session_id)
);
