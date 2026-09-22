drop policy if exists
"Staff read attendance sessions"
on public.attendance_sessions;

create policy
"Staff read attendance sessions"
on public.attendance_sessions
for select
to authenticated
using (
  faculty_id = (select auth.uid())

  or (
    select public.current_campus_role()
  ) in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )

  or public.attendance_current_student_in_session(id)
);


drop policy if exists
"Staff create attendance sessions"
on public.attendance_sessions;

create policy
"Staff create attendance sessions"
on public.attendance_sessions
for insert
to authenticated
with check (
  faculty_id = (select auth.uid())

  and (
    select public.current_campus_role()
  ) in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Staff update attendance sessions"
on public.attendance_sessions;

create policy
"Staff update attendance sessions"
on public.attendance_sessions
for update
to authenticated
using (
  faculty_id = (select auth.uid())

  or (
    select public.current_campus_role()
  ) in (
    'Coordinator',
    'Main Admin'
  )
)
with check (
  faculty_id = (select auth.uid())

  or (
    select public.current_campus_role()
  ) in (
    'Coordinator',
    'Main Admin'
  )
);


notify pgrst, 'reload schema';
