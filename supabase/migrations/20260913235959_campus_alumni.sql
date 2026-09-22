-- ============================================================
-- CAMPUSCONNECT — CAMPUS ALUMNI
-- Published alumni are visible to authenticated campus users.
-- Main Admin, Faculty and Placement Cell manage alumni.
-- ============================================================

create table if not exists
public.campus_alumni (
  id uuid primary key
    default gen_random_uuid(),

  full_name text not null
    check (
      char_length(trim(full_name))
      between 2 and 120
    ),

  graduation_year integer not null
    check (
      graduation_year
      between 1950 and 2100
    ),

  department text not null
    default '',

  job_title text not null
    default '',

  company text not null
    default '',

  location text not null
    default '',

  biography text not null
    default ''
    check (
      char_length(biography)
      <= 2000
    ),

  achievement text not null
    default ''
    check (
      char_length(achievement)
      <= 500
    ),

  photo_url text,
  photo_path text,

  linkedin_url text,

  is_featured boolean not null
    default false,

  display_order integer not null
    default 0,

  status text not null
    default 'Published'
    check (
      status in (
        'Published',
        'Draft',
        'Archived'
      )
    ),

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
  campus_alumni_status_order_idx
on public.campus_alumni(
  status,
  is_featured desc,
  display_order,
  graduation_year desc
);


create index if not exists
  campus_alumni_department_idx
on public.campus_alumni(
  department
);


create or replace function
public.can_manage_campus_alumni()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_campus_role()
    in (
      'Main Admin',
      'Faculty',
      'Placement Cell'
    );
$$;


revoke all
on function
public.can_manage_campus_alumni()
from public;

grant execute
on function
public.can_manage_campus_alumni()
to authenticated;


alter table
public.campus_alumni
enable row level security;


drop policy if exists
  "Campus users read published alumni"
on public.campus_alumni;

create policy
  "Campus users read published alumni"
on public.campus_alumni
for select
to authenticated
using (
  status = 'Published'
  or public.can_manage_campus_alumni()
);


drop policy if exists
  "Authorized staff create alumni"
on public.campus_alumni;

create policy
  "Authorized staff create alumni"
on public.campus_alumni
for insert
to authenticated
with check (
  public.can_manage_campus_alumni()
  and created_by = auth.uid()
);


drop policy if exists
  "Authorized staff update alumni"
on public.campus_alumni;

create policy
  "Authorized staff update alumni"
on public.campus_alumni
for update
to authenticated
using (
  public.can_manage_campus_alumni()
)
with check (
  public.can_manage_campus_alumni()
);


drop policy if exists
  "Authorized staff delete alumni"
on public.campus_alumni;

create policy
  "Authorized staff delete alumni"
on public.campus_alumni
for delete
to authenticated
using (
  public.can_manage_campus_alumni()
);


grant select, insert, update, delete
on public.campus_alumni
to authenticated;


create or replace function
public.set_campus_alumni_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists
  campus_alumni_updated_at
on public.campus_alumni;

create trigger
  campus_alumni_updated_at
before update
on public.campus_alumni
for each row
execute function
  public.set_campus_alumni_updated_at();


insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'campus-alumni',
  'campus-alumni',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit =
    excluded.file_size_limit,
  allowed_mime_types =
    excluded.allowed_mime_types;


drop policy if exists
  "Public read campus alumni photos"
on storage.objects;

create policy
  "Public read campus alumni photos"
on storage.objects
for select
to public
using (
  bucket_id = 'campus-alumni'
);


drop policy if exists
  "Authorized staff upload alumni photos"
on storage.objects;

create policy
  "Authorized staff upload alumni photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'campus-alumni'
  and public.can_manage_campus_alumni()
  and (
    storage.foldername(name)
  )[1] = auth.uid()::text
);


drop policy if exists
  "Authorized staff update alumni photos"
on storage.objects;

create policy
  "Authorized staff update alumni photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'campus-alumni'
  and public.can_manage_campus_alumni()
)
with check (
  bucket_id = 'campus-alumni'
  and public.can_manage_campus_alumni()
);


drop policy if exists
  "Authorized staff delete alumni photos"
on storage.objects;

create policy
  "Authorized staff delete alumni photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'campus-alumni'
  and public.can_manage_campus_alumni()
);
