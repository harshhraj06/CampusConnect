-- =========================================================
-- CAMPUSCONNECT PROFILE MEDIA
-- =========================================================

alter table public.profiles
add column if not exists avatar_url text;

alter table public.profiles
add column if not exists cover_url text;


-- ---------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'profile-media',
  'profile-media',
  true,
  5242880
)
on conflict (id)
do update set
  public = true,
  file_size_limit = 5242880;


-- ---------------------------------------------------------
-- STORAGE POLICIES
-- Folder structure:
-- <user-id>/avatar-...
-- <user-id>/cover-...
-- ---------------------------------------------------------

drop policy if exists
  "Campus users upload profile media"
on storage.objects;

create policy
  "Campus users upload profile media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] =
      auth.uid()::text
);


drop policy if exists
  "Campus users update profile media"
on storage.objects;

create policy
  "Campus users update profile media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] =
      auth.uid()::text
)
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] =
      auth.uid()::text
);


drop policy if exists
  "Public profile media is readable"
on storage.objects;

create policy
  "Public profile media is readable"
on storage.objects
for select
to public
using (
  bucket_id = 'profile-media'
);


drop policy if exists
  "Campus users delete profile media"
on storage.objects;

create policy
  "Campus users delete profile media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] =
      auth.uid()::text
);
