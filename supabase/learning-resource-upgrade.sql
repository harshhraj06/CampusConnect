-- =========================================================
-- CAMPUSCONNECT — ADVANCED LEARNING RESOURCES
-- =========================================================

-- Remove old Video/PYQ-only restriction.
alter table public.learning_resources
drop constraint if exists learning_resources_resource_type_check;

alter table public.learning_resources
add constraint learning_resources_resource_type_check
check (
  resource_type in (
    'Video',
    'PYQ',
    'PDF',
    'Notes',
    'Lab Manual',
    'Important Questions',
    'Assignment Material',
    'External Link'
  )
);

alter table public.learning_resources
add column if not exists description text not null default '';

alter table public.learning_resources
add column if not exists department text not null default 'All';

alter table public.learning_resources
add column if not exists semester text not null default 'All';

alter table public.learning_resources
add column if not exists file_path text;

alter table public.learning_resources
add column if not exists file_name text;

alter table public.learning_resources
add column if not exists file_size bigint;

alter table public.learning_resources
add column if not exists contributor_role text not null default 'Student';


-- =========================================================
-- VERIFICATION
-- =========================================================

create or replace function public.secure_learning_resource()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin

  v_role := public.current_campus_role();

  if tg_op = 'INSERT' then
    new.added_by := auth.uid();
  else
    new.added_by := old.added_by;
  end if;

  new.contributor_role := coalesce(v_role, 'Student');

  new.is_verified :=
    v_role in (
      'Faculty',
      'Coordinator',
      'Placement Cell',
      'Main Admin'
    );

  return new;
end;
$$;


-- =========================================================
-- STORAGE BUCKET
-- =========================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'learning-resources',
  'learning-resources',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do nothing;


-- Signed-in users can upload their own resource files.

drop policy if exists "Campus users upload learning files"
on storage.objects;

create policy "Campus users upload learning files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'learning-resources'
  and (storage.foldername(name))[1] = auth.uid()::text
);


drop policy if exists "Campus users read learning files"
on storage.objects;

create policy "Campus users read learning files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'learning-resources'
);


drop policy if exists "Owners delete learning files"
on storage.objects;

create policy "Owners delete learning files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'learning-resources'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.current_campus_role() = 'Main Admin'
  )
);
