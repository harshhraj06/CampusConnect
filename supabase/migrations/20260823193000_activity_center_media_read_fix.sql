-- ============================================================
-- CAMPUSCONNECT
-- ACTIVITY CENTER MEDIA READ FIX
--
-- VIEW:
-- Student
-- Faculty
-- Placement Cell
-- Coordinator
-- Volunteer
-- Main Admin
--
-- MANAGE:
-- Coordinator
-- Main Admin
-- ============================================================


-- ------------------------------------------------------------
-- Keep Activity Center bucket available for media rendering
-- 50 MB needed for video banners
-- ------------------------------------------------------------

update storage.buckets
set
  public = true,
  file_size_limit = 52428800
where id = 'activity-center';


-- Create bucket if it somehow does not exist
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'activity-center',
  'activity-center',
  true,
  52428800
)
on conflict (id)
do update set
  public = true,
  file_size_limit = 52428800;


-- ============================================================
-- REMOVE POSSIBLE CONFLICTING READ POLICIES
-- ============================================================

drop policy if exists
"Activity media public read"
on storage.objects;

drop policy if exists
"Activity Center media public read"
on storage.objects;

drop policy if exists
"Activity Center authenticated media read"
on storage.objects;

drop policy if exists
"Activity Center users read files"
on storage.objects;


-- ============================================================
-- PUBLIC MEDIA READ
--
-- This only exposes files in the activity-center bucket.
-- It does NOT grant upload/edit/delete.
-- ============================================================

create policy
"Activity Center media public read"
on storage.objects
for select
to public
using (
  bucket_id = 'activity-center'
);


-- ============================================================
-- COORDINATOR + MAIN ADMIN UPLOAD
-- ============================================================

drop policy if exists
"Activity Center coordinators upload files"
on storage.objects;

create policy
"Activity Center coordinators upload files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'activity-center'
  and public.can_manage_activity_center()
);


-- ============================================================
-- COORDINATOR + MAIN ADMIN UPDATE
-- ============================================================

drop policy if exists
"Activity Center coordinators update files"
on storage.objects;

create policy
"Activity Center coordinators update files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'activity-center'
  and public.can_manage_activity_center()
)
with check (
  bucket_id = 'activity-center'
  and public.can_manage_activity_center()
);


-- ============================================================
-- COORDINATOR + MAIN ADMIN DELETE
-- ============================================================

drop policy if exists
"Activity Center coordinators delete files"
on storage.objects;

create policy
"Activity Center coordinators delete files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'activity-center'
  and public.can_manage_activity_center()
);


notify pgrst, 'reload schema';
