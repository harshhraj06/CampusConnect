-- ============================================================
-- CAMPUSCONNECT
-- FIX ANNOUNCEMENT / EVENT / FESTIVAL PUBLISH RLS
-- ============================================================


-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================

alter table public.announcements
enable row level security;


drop policy if exists
"cc_announcements_insert"
on public.announcements;

create policy
"cc_announcements_insert"
on public.announcements
for insert
to authenticated
with check (

  auth.uid() is not null

  and (

    -- Main Admin can publish everything,
    -- including Festivals.
    public.current_campus_role() =
      'Main Admin'

    or

    (
      -- Other approved institutional publishers
      -- cannot create Festival records.
      public.current_campus_role()
        in (
          'Faculty',
          'Coordinator',
          'Placement Cell'
        )

      and coalesce(
        announcement_type,
        'Normal'
      ) <> 'Festival'
    )

  )

);


-- ------------------------------------------------------------
-- UPDATE ANNOUNCEMENTS
-- ------------------------------------------------------------

drop policy if exists
"cc_announcements_update"
on public.announcements;

create policy
"cc_announcements_update"
on public.announcements
for update
to authenticated
using (

  public.current_campus_role() =
    'Main Admin'

  or

  (
    public.current_campus_role()
      in (
        'Faculty',
        'Coordinator',
        'Placement Cell'
      )

    and announcement_type <>
      'Festival'

    and author_id =
      auth.uid()
  )

)
with check (

  public.current_campus_role() =
    'Main Admin'

  or

  (
    public.current_campus_role()
      in (
        'Faculty',
        'Coordinator',
        'Placement Cell'
      )

    and announcement_type <>
      'Festival'

    and author_id =
      auth.uid()
  )

);


-- ------------------------------------------------------------
-- DELETE ANNOUNCEMENTS
-- ------------------------------------------------------------

drop policy if exists
"cc_announcements_delete"
on public.announcements;

create policy
"cc_announcements_delete"
on public.announcements
for delete
to authenticated
using (

  public.current_campus_role() =
    'Main Admin'

  or

  (
    public.current_campus_role()
      in (
        'Faculty',
        'Coordinator',
        'Placement Cell'
      )

    and announcement_type <>
      'Festival'

    and author_id =
      auth.uid()
  )

);



-- ============================================================
-- CAMPUS EVENTS
-- ============================================================

alter table public.campus_events
enable row level security;


drop policy if exists
"cc_events_insert"
on public.campus_events;

create policy
"cc_events_insert"
on public.campus_events
for insert
to authenticated
with check (

  auth.uid() is not null

  and

  public.current_campus_role()
    in (
      'Faculty',
      'Coordinator',
      'Placement Cell',
      'Main Admin'
    )

);


-- ------------------------------------------------------------
-- UPDATE EVENTS
-- ------------------------------------------------------------

drop policy if exists
"cc_events_update"
on public.campus_events;

create policy
"cc_events_update"
on public.campus_events
for update
to authenticated
using (

  public.current_campus_role() =
    'Main Admin'

  or

  (
    public.current_campus_role()
      in (
        'Faculty',
        'Coordinator',
        'Placement Cell'
      )

    and created_by =
      auth.uid()
  )

)
with check (

  public.current_campus_role() =
    'Main Admin'

  or

  (
    public.current_campus_role()
      in (
        'Faculty',
        'Coordinator',
        'Placement Cell'
      )

    and created_by =
      auth.uid()
  )

);


-- ------------------------------------------------------------
-- DELETE EVENTS
-- ------------------------------------------------------------

drop policy if exists
"cc_events_delete"
on public.campus_events;

create policy
"cc_events_delete"
on public.campus_events
for delete
to authenticated
using (

  public.current_campus_role() =
    'Main Admin'

  or

  (
    public.current_campus_role()
      in (
        'Faculty',
        'Coordinator',
        'Placement Cell'
      )

    and created_by =
      auth.uid()
  )

);



-- ============================================================
-- EVENT / FESTIVAL BANNER STORAGE
-- ============================================================

-- Your event and festival upload code uses:
--
-- storage bucket = event-banners
-- path = <auth-user-id>/...
--
-- Therefore storage.objects also needs INSERT permission.


drop policy if exists
"cc_event_banners_insert"
on storage.objects;

create policy
"cc_event_banners_insert"
on storage.objects
for insert
to authenticated
with check (

  bucket_id =
    'event-banners'

  and

  public.current_campus_role()
    in (
      'Faculty',
      'Coordinator',
      'Placement Cell',
      'Main Admin'
    )

  and

  (storage.foldername(name))[1] =
    auth.uid()::text

);


-- ------------------------------------------------------------
-- UPDATE OWN BANNER FILES
-- ------------------------------------------------------------

drop policy if exists
"cc_event_banners_update"
on storage.objects;

create policy
"cc_event_banners_update"
on storage.objects
for update
to authenticated
using (

  bucket_id =
    'event-banners'

  and

  (
    public.current_campus_role() =
      'Main Admin'

    or

    (
      public.current_campus_role()
        in (
          'Faculty',
          'Coordinator',
          'Placement Cell'
        )

      and owner_id =
        auth.uid()::text
    )
  )

)
with check (

  bucket_id =
    'event-banners'

);


-- ------------------------------------------------------------
-- DELETE OWN BANNER FILES
-- ------------------------------------------------------------

drop policy if exists
"cc_event_banners_delete"
on storage.objects;

create policy
"cc_event_banners_delete"
on storage.objects
for delete
to authenticated
using (

  bucket_id =
    'event-banners'

  and

  (
    public.current_campus_role() =
      'Main Admin'

    or owner_id =
      auth.uid()::text
  )

);


notify pgrst, 'reload schema';
