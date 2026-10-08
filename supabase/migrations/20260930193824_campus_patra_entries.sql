create table if not exists
public.campus_patra_entries (
  id uuid primary key
    default gen_random_uuid(),

  eyebrow text not null
    default '',

  title text not null
    check (
      char_length(
        trim(title)
      )
      between 2 and 180
    ),

  body text not null
    default ''
    check (
      char_length(body)
      <= 10000
    ),

  image_url text not null
    default '',

  image_path text,

  link_label text not null
    default '',

  link_url text not null
    default '',

  display_order integer not null
    default 100,

  is_published boolean not null
    default true,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
campus_patra_entries_order_idx
on public.campus_patra_entries(
  is_published,
  display_order,
  created_at
);


create or replace function
public.touch_campus_patra_entry()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at =
    now();

  return new;
end;
$$;


drop trigger if exists
campus_patra_entry_updated_at
on public.campus_patra_entries;


create trigger
campus_patra_entry_updated_at
before update
on public.campus_patra_entries
for each row
execute function
public.touch_campus_patra_entry();


alter table
public.campus_patra_entries
enable row level security;


grant
select,
insert,
update,
delete
on public.campus_patra_entries
to authenticated;


drop policy if exists
"Campus users read published Patra entries"
on public.campus_patra_entries;


create policy
"Campus users read published Patra entries"
on public.campus_patra_entries
for select
to authenticated
using (
  is_published = true

  or

  public.current_campus_role()::text =
    'Main Admin'
);


drop policy if exists
"Main Admin creates Patra entries"
on public.campus_patra_entries;


create policy
"Main Admin creates Patra entries"
on public.campus_patra_entries
for insert
to authenticated
with check (
  public.current_campus_role()::text =
    'Main Admin'
);


drop policy if exists
"Main Admin updates Patra entries"
on public.campus_patra_entries;


create policy
"Main Admin updates Patra entries"
on public.campus_patra_entries
for update
to authenticated
using (
  public.current_campus_role()::text =
    'Main Admin'
)
with check (
  public.current_campus_role()::text =
    'Main Admin'
);


drop policy if exists
"Main Admin deletes Patra entries"
on public.campus_patra_entries;


create policy
"Main Admin deletes Patra entries"
on public.campus_patra_entries
for delete
to authenticated
using (
  public.current_campus_role()::text =
    'Main Admin'
);


insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'campus-patra',
  'campus-patra',
  true,
  8388608,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id)
do update set
  public =
    excluded.public,

  file_size_limit =
    excluded.file_size_limit,

  allowed_mime_types =
    excluded.allowed_mime_types;


drop policy if exists
"Public reads Patra images"
on storage.objects;


create policy
"Public reads Patra images"
on storage.objects
for select
to public
using (
  bucket_id =
    'campus-patra'
);


drop policy if exists
"Main Admin uploads Patra images"
on storage.objects;


create policy
"Main Admin uploads Patra images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id =
    'campus-patra'

  and

  public.current_campus_role()::text =
    'Main Admin'
);


drop policy if exists
"Main Admin updates Patra images"
on storage.objects;


create policy
"Main Admin updates Patra images"
on storage.objects
for update
to authenticated
using (
  bucket_id =
    'campus-patra'

  and

  public.current_campus_role()::text =
    'Main Admin'
)
with check (
  bucket_id =
    'campus-patra'

  and

  public.current_campus_role()::text =
    'Main Admin'
);


drop policy if exists
"Main Admin deletes Patra images"
on storage.objects;


create policy
"Main Admin deletes Patra images"
on storage.objects
for delete
to authenticated
using (
  bucket_id =
    'campus-patra'

  and

  public.current_campus_role()::text =
    'Main Admin'
);


notify pgrst,
'reload schema';
