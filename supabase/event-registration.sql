-- =========================================================
-- CAMPUSCONNECT — EVENT REGISTRATION
-- =========================================================

-- Extra registration configuration on events

alter table public.campus_events
add column if not exists registration_deadline timestamptz;

alter table public.campus_events
add column if not exists capacity integer;

alter table public.campus_events
add column if not exists allow_campus_registration boolean
not null default true;


-- =========================================================
-- EVENT REGISTRATIONS
-- =========================================================

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references public.campus_events(id)
    on delete cascade,

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  student_name text not null default '',
  student_email text not null default '',
  department text not null default '',
  graduation_year text not null default '',

  status text not null default 'Going'
    check (status in ('Going', 'Cancelled')),

  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(event_id, student_id)
);


create index if not exists event_registrations_event_idx
on public.event_registrations(event_id);

create index if not exists event_registrations_student_idx
on public.event_registrations(student_id);


alter table public.event_registrations
enable row level security;


-- =========================================================
-- RLS
-- =========================================================

drop policy if exists "Students view own event registrations"
on public.event_registrations;

drop policy if exists "Staff view event registrations"
on public.event_registrations;

drop policy if exists "Students register for events"
on public.event_registrations;

drop policy if exists "Students update own event registration"
on public.event_registrations;

drop policy if exists "Students delete own event registration"
on public.event_registrations;


-- Student sees own registration.
-- Staff can view attendee lists.

create policy "Students view own event registrations"
on public.event_registrations
for select
to authenticated
using (
  student_id = auth.uid()
  or public.current_campus_role()
     in ('Faculty', 'Placement Cell')
);


create policy "Students register for events"
on public.event_registrations
for insert
to authenticated
with check (
  student_id = auth.uid()
  and public.current_campus_role() = 'Student'
);


create policy "Students update own event registration"
on public.event_registrations
for update
to authenticated
using (
  student_id = auth.uid()
)
with check (
  student_id = auth.uid()
);


create policy "Students delete own event registration"
on public.event_registrations
for delete
to authenticated
using (
  student_id = auth.uid()
);
