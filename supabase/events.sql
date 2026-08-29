-- =========================================================
-- CAMPUSCONNECT — CAMPUS EVENTS
-- =========================================================

create table if not exists public.campus_events (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  short_description text not null default '',
  description text not null default '',

  category text not null default 'Campus',
  venue text not null default '',
  organizer text not null default '',

  event_date timestamptz not null,
  end_date timestamptz,

  banner_url text,
  registration_url text,

  audience_department text not null default 'All',
  audience_year text not null default 'All',

  is_featured boolean not null default false,
  status text not null default 'Published'
    check (status in ('Draft', 'Published', 'Cancelled')),

  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campus_events_date_idx
on public.campus_events(event_date);

create index if not exists campus_events_featured_idx
on public.campus_events(is_featured);

alter table public.campus_events enable row level security;

-- Remove old policies safely
drop policy if exists "Published events visible"
on public.campus_events;

drop policy if exists "Staff create events"
on public.campus_events;

drop policy if exists "Event authors update"
on public.campus_events;

drop policy if exists "Event authors delete"
on public.campus_events;

-- Students/staff can read published events.
-- Staff can also see their own drafts.
create policy "Published events visible"
on public.campus_events
for select
to authenticated
using (
  status = 'Published'
  or created_by = auth.uid()
  or public.current_campus_role() in ('Faculty', 'Placement Cell')
);

-- Only verified staff can create
create policy "Staff create events"
on public.campus_events
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.current_campus_role() in ('Faculty', 'Placement Cell')
);

-- Creator or Placement Cell can edit
create policy "Event authors update"
on public.campus_events
for update
to authenticated
using (
  created_by = auth.uid()
  or public.current_campus_role() = 'Placement Cell'
)
with check (
  created_by = auth.uid()
  or public.current_campus_role() = 'Placement Cell'
);

-- Creator or Placement Cell can delete
create policy "Event authors delete"
on public.campus_events
for delete
to authenticated
using (
  created_by = auth.uid()
  or public.current_campus_role() = 'Placement Cell'
);

-- =========================================================
-- EVENT BANNER STORAGE
-- =========================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'event-banners',
  'event-banners',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

drop policy if exists "Public event banners"
on storage.objects;

drop policy if exists "Staff upload event banners"
on storage.objects;

drop policy if exists "Staff update event banners"
on storage.objects;

drop policy if exists "Staff delete event banners"
on storage.objects;

create policy "Public event banners"
on storage.objects
for select
to public
using (
  bucket_id = 'event-banners'
);

create policy "Staff upload event banners"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-banners'
  and public.current_campus_role() in ('Faculty', 'Placement Cell')
);

create policy "Staff update event banners"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'event-banners'
  and public.current_campus_role() in ('Faculty', 'Placement Cell')
);

create policy "Staff delete event banners"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-banners'
  and public.current_campus_role() in ('Faculty', 'Placement Cell')
);
