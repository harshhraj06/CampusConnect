insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'campus-content',
  'campus-content',
  true,
  8388608
)
on conflict (id)
do update set
  public = true,
  file_size_limit = 8388608;


drop policy if exists
  "Campus staff upload content media"
on storage.objects;

create policy
  "Campus staff upload content media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'campus-content'
  and
  (storage.foldername(name))[1] =
    auth.uid()::text
  and
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
  "Campus content media public read"
on storage.objects;

create policy
  "Campus content media public read"
on storage.objects
for select
to public
using (
  bucket_id = 'campus-content'
);


drop policy if exists
  "Campus staff delete own content media"
on storage.objects;

create policy
  "Campus staff delete own content media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'campus-content'
  and
  (storage.foldername(name))[1] =
    auth.uid()::text
);
