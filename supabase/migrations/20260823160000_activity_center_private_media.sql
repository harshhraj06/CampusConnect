-- ============================================================
-- CAMPUSCONNECT
-- ACTIVITY CENTER — PRIVATE STORAGE
-- ============================================================

-- ------------------------------------------------------------
-- PRIVATE BUCKET
-- ------------------------------------------------------------

update storage.buckets
set
  public = false,
  file_size_limit = 52428800
where id = 'activity-center';


-- ------------------------------------------------------------
-- REMOVE PUBLIC READ ACCESS
-- ------------------------------------------------------------

drop policy if exists
"Activity media public read"
on storage.objects;


-- ------------------------------------------------------------
-- REMOVE EVERY LEGACY WRITE POLICY
-- ------------------------------------------------------------

drop policy if exists
"Activity staff upload"
on storage.objects;

drop policy if exists
"Activity staff update"
on storage.objects;

drop policy if exists
"Activity staff delete"
on storage.objects;


-- ------------------------------------------------------------
-- REMOVE EXISTING NEW POLICIES BEFORE RECREATING
-- ------------------------------------------------------------

drop policy if exists
"Activity Center coordinators read files"
on storage.objects;

drop policy if exists
"Activity Center coordinators upload files"
on storage.objects;

drop policy if exists
"Activity Center coordinators update files"
on storage.objects;

drop policy if exists
"Activity Center coordinators delete files"
on storage.objects;


-- ============================================================
-- PRIVATE READ
-- Coordinator + Main Admin only
-- ============================================================

create policy
"Activity Center coordinators read files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'activity-center'
  and public.current_campus_role()
      in (
        'Coordinator',
        'Main Admin'
      )
);


-- ============================================================
-- PRIVATE UPLOAD
-- ============================================================

create policy
"Activity Center coordinators upload files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'activity-center'
  and public.current_campus_role()
      in (
        'Coordinator',
        'Main Admin'
      )
);


-- ============================================================
-- PRIVATE UPDATE
-- ============================================================

create policy
"Activity Center coordinators update files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'activity-center'
  and public.current_campus_role()
      in (
        'Coordinator',
        'Main Admin'
      )
)
with check (
  bucket_id = 'activity-center'
  and public.current_campus_role()
      in (
        'Coordinator',
        'Main Admin'
      )
);


-- ============================================================
-- PRIVATE DELETE
-- ============================================================

create policy
"Activity Center coordinators delete files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'activity-center'
  and public.current_campus_role()
      in (
        'Coordinator',
        'Main Admin'
      )
);


notify pgrst, 'reload schema';
