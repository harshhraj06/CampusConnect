-- =========================================================
-- CAMPUSCONNECT
-- PRODUCTION ATTENDANCE SESSION SYSTEM
-- =========================================================

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),

  batch_id uuid not null
    references public.attendance_batches(id)
    on delete cascade,

  subject text not null,

  attendance_date date not null default current_date,

  period_name text not null default '',

  topic text not null default '',

  faculty_id uuid not null
    references auth.users(id)
    on delete cascade,

  faculty_name text not null default '',

  status text not null default 'Draft'
    check (
      status in (
        'Draft',
        'Completed'
      )
    ),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  unique (
    batch_id,
    subject,
    attendance_date,
    period_name
  )
);


create table if not exists public.attendance_session_entries (
  id uuid primary key default gen_random_uuid(),

  session_id uuid not null
    references public.attendance_sessions(id)
    on delete cascade,

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  student_name text not null,

  campus_uid text not null,

  attendance_status text not null default 'Present'
    check (
      attendance_status in (
        'Present',
        'Absent',
        'Late',
        'Excused'
      )
    ),

  note text not null default '',

  marked_at timestamptz not null default now(),

  unique (
    session_id,
    student_id
  )
);


create index if not exists
attendance_sessions_batch_idx
on public.attendance_sessions(
  batch_id,
  attendance_date desc
);


create index if not exists
attendance_sessions_faculty_idx
on public.attendance_sessions(
  faculty_id
);


create index if not exists
attendance_session_entries_session_idx
on public.attendance_session_entries(
  session_id
);


create index if not exists
attendance_session_entries_student_idx
on public.attendance_session_entries(
  student_id
);


-- =========================================================
-- RLS
-- =========================================================

alter table public.attendance_sessions
enable row level security;

alter table public.attendance_session_entries
enable row level security;


grant
select,
insert,
update,
delete
on public.attendance_sessions
to authenticated;


grant
select,
insert,
update,
delete
on public.attendance_session_entries
to authenticated;


-- =========================================================
-- FACULTY / COORDINATOR / ADMIN SESSION ACCESS
-- =========================================================

drop policy if exists
"Staff read attendance sessions"
on public.attendance_sessions;

create policy
"Staff read attendance sessions"
on public.attendance_sessions
for select
to authenticated
using (
  faculty_id = auth.uid()

  or public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )

  or exists (
    select 1
    from public.attendance_session_entries entry
    where
      entry.session_id = attendance_sessions.id
      and entry.student_id = auth.uid()
  )
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
  faculty_id = auth.uid()

  and public.current_campus_role() in (
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
  faculty_id = auth.uid()

  or public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
)
with check (
  faculty_id = auth.uid()

  or public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Staff delete attendance sessions"
on public.attendance_sessions;

create policy
"Staff delete attendance sessions"
on public.attendance_sessions
for delete
to authenticated
using (
  faculty_id = auth.uid()

  or public.current_campus_role() =
    'Main Admin'
);


-- =========================================================
-- ATTENDANCE ENTRIES
-- =========================================================

drop policy if exists
"Attendance entries readable"
on public.attendance_session_entries;

create policy
"Attendance entries readable"
on public.attendance_session_entries
for select
to authenticated
using (
  student_id = auth.uid()

  or exists (
    select 1
    from public.attendance_sessions session
    where
      session.id =
        attendance_session_entries.session_id

      and (
        session.faculty_id =
          auth.uid()

        or public.current_campus_role()
          in (
            'Faculty',
            'Coordinator',
            'Main Admin'
          )
      )
  )
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
  exists (
    select 1
    from public.attendance_sessions session
    where
      session.id =
        attendance_session_entries.session_id

      and (
        session.faculty_id =
          auth.uid()

        or public.current_campus_role()
          in (
            'Coordinator',
            'Main Admin'
          )
      )
  )
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
  exists (
    select 1
    from public.attendance_sessions session
    where
      session.id =
        attendance_session_entries.session_id

      and (
        session.faculty_id =
          auth.uid()

        or public.current_campus_role()
          in (
            'Coordinator',
            'Main Admin'
          )
      )
  )
)
with check (
  exists (
    select 1
    from public.attendance_sessions session
    where
      session.id =
        attendance_session_entries.session_id

      and (
        session.faculty_id =
          auth.uid()

        or public.current_campus_role()
          in (
            'Coordinator',
            'Main Admin'
          )
      )
  )
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
  exists (
    select 1
    from public.attendance_sessions session
    where
      session.id =
        attendance_session_entries.session_id

      and (
        session.faculty_id =
          auth.uid()

        or public.current_campus_role()
          in (
            'Coordinator',
            'Main Admin'
          )
      )
  )
);

