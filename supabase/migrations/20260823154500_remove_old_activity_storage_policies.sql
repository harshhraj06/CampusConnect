-- ============================================================
-- CAMPUSCONNECT
-- REMOVE LEGACY ACTIVITY CENTER STORAGE ACCESS
--
-- Only:
--   Coordinator
--   Main Admin
--
-- may upload/update/delete Activity Center files.
-- ============================================================


-- ------------------------------------------------------------
-- REMOVE OLD POLICIES THAT STILL ALLOW FACULTY
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
-- RECREATE CURRENT WRITE POLICIES CLEANLY
-- ------------------------------------------------------------

drop policy if exists
"Activity Center coordinators upload files"
on storage.objects;

drop policy if exists
"Activity Center coordinators update files"
on storage.objects;

drop policy if exists
"Activity Center coordinators delete files"
on storage.objects;


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
