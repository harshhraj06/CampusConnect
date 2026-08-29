-- ============================================================
-- CAMPUSCONNECT
-- CLUB IMAGE + VIDEO SAVE FIX
-- ============================================================

-- Video field required by Activity Center
alter table public.campus_clubs
add column if not exists video_banner_url text;


-- ============================================================
-- STORAGE BUCKET
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'activity-center',
  'activity-center',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v'
  ]
)
on conflict (id)
do update set

  public = false,

  file_size_limit =
    52428800,

  allowed_mime_types =
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-m4v'
    ];


-- ============================================================
-- MANAGER PERMISSION
-- ============================================================

create or replace function
public.can_manage_activity_center()
returns boolean

language sql
stable

security definer

set search_path = public

as $$

  select exists (

    select 1

    from public.profiles p

    where
      p.id = auth.uid()

      and p.role in (
        'Coordinator',
        'Main Admin'
      )

  );

$$;


revoke all
on function
public.can_manage_activity_center()
from public;


grant execute
on function
public.can_manage_activity_center()
to authenticated;


-- ============================================================
-- STORAGE — UPLOAD
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

  bucket_id =
    'activity-center'

  and
    public.can_manage_activity_center()

  and
    (storage.foldername(name))[1] =
      auth.uid()::text

);


-- ============================================================
-- STORAGE — READ
--
-- All logged-in CampusConnect users may VIEW club media.
-- Only Coordinator/Main Admin may upload.
-- ============================================================

drop policy if exists
"Activity Center authenticated read files"
on storage.objects;


create policy
"Activity Center authenticated read files"

on storage.objects

for select

to authenticated

using (

  bucket_id =
    'activity-center'

);


-- ============================================================
-- STORAGE — UPDATE
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

  bucket_id =
    'activity-center'

  and
    public.can_manage_activity_center()

)

with check (

  bucket_id =
    'activity-center'

  and
    public.can_manage_activity_center()

);


-- ============================================================
-- STORAGE — DELETE
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

  bucket_id =
    'activity-center'

  and
    public.can_manage_activity_center()

);


-- ============================================================
-- DATABASE PERMISSIONS
-- ============================================================

grant
select,
insert,
update,
delete

on table
public.campus_clubs

to authenticated;


notify pgrst, 'reload schema';

