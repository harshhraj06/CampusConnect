-- ============================================================
-- CAMPUSCONNECT
-- ATTENDANCE NOTIFICATION FOUNDATION
--
-- Existing attendance tables are intentionally unchanged.
-- ============================================================


-- ============================================================
-- 1. PRIVATE STUDENT GUARDIAN CONTACTS
-- ============================================================

create table if not exists public.student_guardian_contacts (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  guardian_name text not null default '',

  relationship text not null default 'Parent',

  email text not null default '',

  phone text not null default '',

  sms_enabled boolean not null default true,

  email_enabled boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  unique (student_id)
);


create index if not exists
student_guardian_contacts_student_idx
on public.student_guardian_contacts(student_id);


alter table public.student_guardian_contacts
enable row level security;


-- Student can see only their own guardian contact.
drop policy if exists
  "Students read own guardian contact"
on public.student_guardian_contacts;

create policy
  "Students read own guardian contact"
on public.student_guardian_contacts
for select
to authenticated
using (
  student_id = (select auth.uid())
);


-- Student can create their own guardian contact.
drop policy if exists
  "Students create own guardian contact"
on public.student_guardian_contacts;

create policy
  "Students create own guardian contact"
on public.student_guardian_contacts
for insert
to authenticated
with check (
  student_id = (select auth.uid())
);


-- Student can update only their own guardian contact.
drop policy if exists
  "Students update own guardian contact"
on public.student_guardian_contacts;

create policy
  "Students update own guardian contact"
on public.student_guardian_contacts
for update
to authenticated
using (
  student_id = (select auth.uid())
)
with check (
  student_id = (select auth.uid())
);


-- ============================================================
-- 2. ATTENDANCE NOTIFICATION OUTBOX
-- ============================================================

create table if not exists public.attendance_notification_outbox (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  session_id uuid
    references public.attendance_sessions(id)
    on delete cascade,

  notification_type text not null
    check (
      notification_type in (
        'absence_parent_email',
        'absence_parent_sms',
        'low_attendance_student_email',
        'low_attendance_in_app'
      )
    ),

  recipient_type text not null
    check (
      recipient_type in (
        'student',
        'guardian'
      )
    ),

  channel text not null
    check (
      channel in (
        'email',
        'sms',
        'in_app'
      )
    ),

  recipient text not null default '',

  subject text not null default '',

  message text not null default '',

  delivery_status text not null default 'Pending'
    check (
      delivery_status in (
        'Pending',
        'Processing',
        'Sent',
        'Failed',
        'Skipped'
      )
    ),

  attempts integer not null default 0
    check (attempts >= 0),

  provider_message_id text not null default '',

  last_error text not null default '',

  sent_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


create index if not exists
attendance_notification_outbox_student_idx
on public.attendance_notification_outbox(
  student_id,
  created_at desc
);


create index if not exists
attendance_notification_outbox_status_idx
on public.attendance_notification_outbox(
  delivery_status,
  created_at
);


-- Prevent duplicate absence notifications for the same
-- student/session/channel.
create unique index if not exists
attendance_notification_absence_unique
on public.attendance_notification_outbox(
  session_id,
  student_id,
  notification_type
)
where session_id is not null;


alter table public.attendance_notification_outbox
enable row level security;


-- Students may see only their own in-app notification records.
drop policy if exists
  "Students read own attendance notifications"
on public.attendance_notification_outbox;

create policy
  "Students read own attendance notifications"
on public.attendance_notification_outbox
for select
to authenticated
using (
  student_id = (select auth.uid())
  and channel = 'in_app'
);


-- No INSERT / UPDATE / DELETE policy is intentionally provided.
-- Outbox creation and delivery will happen through trusted
-- server-side/database functions instead of browser writes.


-- ============================================================
-- 3. ATTENDANCE NOTIFICATION SETTINGS
-- ============================================================

create table if not exists public.attendance_notification_settings (
  id boolean primary key default true
    check (id = true),

  minimum_attendance_percentage numeric(5,2)
    not null default 75.00
    check (
      minimum_attendance_percentage >= 0
      and minimum_attendance_percentage <= 100
    ),

  absence_parent_email_enabled boolean
    not null default true,

  absence_parent_sms_enabled boolean
    not null default true,

  low_attendance_student_email_enabled boolean
    not null default true,

  low_attendance_in_app_enabled boolean
    not null default true,

  updated_at timestamptz not null default now(),

  updated_by uuid references auth.users(id)
    on delete set null
);


insert into public.attendance_notification_settings(id)
values (true)
on conflict (id) do nothing;


alter table public.attendance_notification_settings
enable row level security;


-- All authenticated users can read the threshold/configuration.
drop policy if exists
  "Authenticated read attendance notification settings"
on public.attendance_notification_settings;

create policy
  "Authenticated read attendance notification settings"
on public.attendance_notification_settings
for select
to authenticated
using (true);


-- ============================================================
-- 4. STUDENT IN-APP ATTENDANCE NOTIFICATIONS
-- ============================================================

create table if not exists public.student_attendance_notifications (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  subject text not null default '',

  title text not null,

  message text not null,

  notification_type text not null
    check (
      notification_type in (
        'low_attendance',
        'attendance_warning'
      )
    ),

  attendance_percentage numeric(5,2),

  threshold_percentage numeric(5,2),

  is_read boolean not null default false,

  created_at timestamptz not null default now()
);


create index if not exists
student_attendance_notifications_student_idx
on public.student_attendance_notifications(
  student_id,
  created_at desc
);


alter table public.student_attendance_notifications
enable row level security;


drop policy if exists
  "Students read own attendance alerts"
on public.student_attendance_notifications;

create policy
  "Students read own attendance alerts"
on public.student_attendance_notifications
for select
to authenticated
using (
  student_id = (select auth.uid())
);


drop policy if exists
  "Students update own attendance alerts"
on public.student_attendance_notifications;

create policy
  "Students update own attendance alerts"
on public.student_attendance_notifications
for update
to authenticated
using (
  student_id = (select auth.uid())
)
with check (
  student_id = (select auth.uid())
);


-- ============================================================
-- 5. PRIVILEGES
-- ============================================================

grant select, insert, update
on public.student_guardian_contacts
to authenticated;


grant select
on public.attendance_notification_settings
to authenticated;


grant select
on public.student_attendance_notifications
to authenticated;

grant update (is_read)
on public.student_attendance_notifications
to authenticated;


grant select
on public.attendance_notification_outbox
to authenticated;


-- ============================================================
-- END
-- ============================================================
