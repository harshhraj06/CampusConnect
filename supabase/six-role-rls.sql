-- =========================================================
-- CAMPUSCONNECT — SIX ROLE RLS UPGRADE
-- =========================================================

-- ---------------------------------------------------------
-- ANNOUNCEMENTS
-- Faculty / Coordinator / Placement Cell / Main Admin
-- ---------------------------------------------------------

drop policy if exists "Staff publish announcements"
on public.announcements;

create policy "Staff publish announcements"
on public.announcements
for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  )
);


-- ---------------------------------------------------------
-- ASSIGNMENTS
-- Faculty / Placement Cell / Main Admin
-- ---------------------------------------------------------

drop policy if exists "Staff create assignments"
on public.assignments;

create policy "Staff create assignments"
on public.assignments
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.current_campus_role() in (
    'Faculty',
    'Placement Cell',
    'Main Admin'
  )
);


-- ---------------------------------------------------------
-- ASSIGNMENT SUBMISSIONS
-- Student owns submission.
-- Faculty / Placement Cell / Main Admin may review.
-- ---------------------------------------------------------

drop policy if exists "Submission access"
on public.assignment_submissions;

create policy "Submission access"
on public.assignment_submissions
for select
to authenticated
using (
  student_id = auth.uid()
  or public.current_campus_role() in (
    'Faculty',
    'Placement Cell',
    'Main Admin'
  )
);


-- ---------------------------------------------------------
-- ATTENDANCE
-- Student sees own.
-- Faculty + Main Admin manage.
-- Coordinator / Volunteer / Placement Cell do NOT gain
-- academic attendance management.
-- ---------------------------------------------------------

drop policy if exists "Attendance access"
on public.attendance_records;

drop policy if exists "Staff record attendance"
on public.attendance_records;

drop policy if exists "Staff update attendance"
on public.attendance_records;

create policy "Attendance access"
on public.attendance_records
for select
to authenticated
using (
  student_id = auth.uid()
  or public.current_campus_role() in (
    'Faculty',
    'Main Admin'
  )
);

create policy "Staff record attendance"
on public.attendance_records
for insert
to authenticated
with check (
  public.current_campus_role() in (
    'Faculty',
    'Main Admin'
  )
);

create policy "Staff update attendance"
on public.attendance_records
for update
to authenticated
using (
  public.current_campus_role() in (
    'Faculty',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Faculty',
    'Main Admin'
  )
);


-- ---------------------------------------------------------
-- PLACEMENT APPLICATIONS
-- Student sees own.
-- Placement Cell + Main Admin manage.
-- ---------------------------------------------------------

drop policy if exists "Application access"
on public.placement_applications;

drop policy if exists "Placement staff update applications"
on public.placement_applications;

create policy "Application access"
on public.placement_applications
for select
to authenticated
using (
  student_id = auth.uid()
  or public.current_campus_role() in (
    'Placement Cell',
    'Main Admin'
  )
);

create policy "Placement staff update applications"
on public.placement_applications
for update
to authenticated
using (
  public.current_campus_role() in (
    'Placement Cell',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Placement Cell',
    'Main Admin'
  )
);


-- ---------------------------------------------------------
-- PLACEMENT DRIVES
-- Placement Cell + Main Admin only.
-- ---------------------------------------------------------

drop policy if exists "Placement staff create drives"
on public.placement_drives;

drop policy if exists "Placement staff manage drives"
on public.placement_drives;

drop policy if exists "Placement staff delete drives"
on public.placement_drives;

create policy "Placement staff create drives"
on public.placement_drives
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.current_campus_role() in (
    'Placement Cell',
    'Main Admin'
  )
);

create policy "Placement staff manage drives"
on public.placement_drives
for update
to authenticated
using (
  public.current_campus_role() in (
    'Placement Cell',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Placement Cell',
    'Main Admin'
  )
);

create policy "Placement staff delete drives"
on public.placement_drives
for delete
to authenticated
using (
  public.current_campus_role() in (
    'Placement Cell',
    'Main Admin'
  )
);


-- ---------------------------------------------------------
-- LEARNING RESOURCES
-- Faculty / Placement Cell / Main Admin verify/manage.
-- ---------------------------------------------------------

drop policy if exists "Owners manage learning resources"
on public.learning_resources;

drop policy if exists "Owners delete learning resources"
on public.learning_resources;

create policy "Owners manage learning resources"
on public.learning_resources
for update
to authenticated
using (
  added_by = auth.uid()
  or public.current_campus_role() in (
    'Faculty',
    'Placement Cell',
    'Main Admin'
  )
)
with check (
  added_by = auth.uid()
  or public.current_campus_role() in (
    'Faculty',
    'Placement Cell',
    'Main Admin'
  )
);

create policy "Owners delete learning resources"
on public.learning_resources
for delete
to authenticated
using (
  added_by = auth.uid()
  or public.current_campus_role() in (
    'Faculty',
    'Placement Cell',
    'Main Admin'
  )
);


-- ---------------------------------------------------------
-- COMMUNITY GROUPS
-- Owner manages own group.
-- Main Admin can manage everything.
-- ---------------------------------------------------------

drop policy if exists "Owners manage groups"
on public.community_groups;

drop policy if exists "Owners delete groups"
on public.community_groups;

create policy "Owners manage groups"
on public.community_groups
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.current_campus_role() = 'Main Admin'
)
with check (
  owner_id = auth.uid()
  or public.current_campus_role() = 'Main Admin'
);

create policy "Owners delete groups"
on public.community_groups
for delete
to authenticated
using (
  owner_id = auth.uid()
  or public.current_campus_role() = 'Main Admin'
);


-- ---------------------------------------------------------
-- PROFILE DOCUMENTS
-- Owner only, except Main Admin.
-- ---------------------------------------------------------

drop policy if exists "Document owner access"
on public.profile_documents;

create policy "Document owner access"
on public.profile_documents
for select
to authenticated
using (
  owner_id = auth.uid()
  or public.current_campus_role() = 'Main Admin'
);


-- ---------------------------------------------------------
-- CAMPUS EVENTS
-- Faculty / Coordinator / Placement Cell / Main Admin create.
-- Owner or Main Admin manage.
-- Volunteer does NOT edit events.
-- ---------------------------------------------------------

drop policy if exists "Staff create events"
on public.campus_events;

drop policy if exists "Staff update events"
on public.campus_events;

drop policy if exists "Staff delete events"
on public.campus_events;

create policy "Staff create events"
on public.campus_events
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  )
);

create policy "Staff update events"
on public.campus_events
for update
to authenticated
using (
  created_by = auth.uid()
  or public.current_campus_role() = 'Main Admin'
)
with check (
  created_by = auth.uid()
  or public.current_campus_role() = 'Main Admin'
);

create policy "Staff delete events"
on public.campus_events
for delete
to authenticated
using (
  created_by = auth.uid()
  or public.current_campus_role() = 'Main Admin'
);


-- ---------------------------------------------------------
-- EVENT REGISTRATIONS
-- Student sees own.
-- Event-operational roles can view attendees.
-- ---------------------------------------------------------

drop policy if exists "Students view own event registrations"
on public.event_registrations;

create policy "Students view own event registrations"
on public.event_registrations
for select
to authenticated
using (
  student_id = auth.uid()
  or public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Volunteer',
    'Placement Cell',
    'Main Admin'
  )
);


-- ---------------------------------------------------------
-- PROFILE DIRECTORY
-- Active accounts only.
-- ---------------------------------------------------------

drop policy if exists "Campus profile directory access"
on public.profiles;

create policy "Campus profile directory access"
on public.profiles
for select
to authenticated
using (
  account_status = 'Active'
);
