create table if not exists
public.campus_team_members (
  id uuid primary key
    default gen_random_uuid(),

  name text not null
    check (
      char_length(
        trim(name)
      )
      between 2 and 120
    ),

  role text not null
    default '',

  image_url text not null
    default '',

  image_path text,

  website_url text not null
    default '',

  linkedin_url text not null
    default '',

  display_order integer not null
    default 100,

  is_active boolean not null
    default true,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique (
    name,
    role
  )
);


create index if not exists
campus_team_members_order_idx
on public.campus_team_members(
  is_active,
  display_order,
  created_at
);


create or replace function
public.touch_campus_team_member()
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
campus_team_member_updated_at
on public.campus_team_members;


create trigger
campus_team_member_updated_at
before update
on public.campus_team_members
for each row
execute function
public.touch_campus_team_member();


alter table
public.campus_team_members
enable row level security;


grant
select,
insert,
update,
delete
on public.campus_team_members
to authenticated;


drop policy if exists
"Campus users read active team members"
on public.campus_team_members;


create policy
"Campus users read active team members"
on public.campus_team_members
for select
to authenticated
using (
  is_active = true

  or
  public.current_campus_role()::text =
    'Main Admin'
);


drop policy if exists
"Main Admin creates team members"
on public.campus_team_members;


create policy
"Main Admin creates team members"
on public.campus_team_members
for insert
to authenticated
with check (
  public.current_campus_role()::text =
    'Main Admin'
);


drop policy if exists
"Main Admin updates team members"
on public.campus_team_members;


create policy
"Main Admin updates team members"
on public.campus_team_members
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
"Main Admin deletes team members"
on public.campus_team_members;


create policy
"Main Admin deletes team members"
on public.campus_team_members
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
  'campus-team',
  'campus-team',
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
"Public reads campus team pictures"
on storage.objects;


create policy
"Public reads campus team pictures"
on storage.objects
for select
to public
using (
  bucket_id =
    'campus-team'
);


drop policy if exists
"Main Admin uploads campus team pictures"
on storage.objects;


create policy
"Main Admin uploads campus team pictures"
on storage.objects
for insert
to authenticated
with check (
  bucket_id =
    'campus-team'

  and
  public.current_campus_role()::text =
    'Main Admin'
);


drop policy if exists
"Main Admin updates campus team pictures"
on storage.objects;


create policy
"Main Admin updates campus team pictures"
on storage.objects
for update
to authenticated
using (
  bucket_id =
    'campus-team'

  and
  public.current_campus_role()::text =
    'Main Admin'
)
with check (
  bucket_id =
    'campus-team'

  and
  public.current_campus_role()::text =
    'Main Admin'
);


drop policy if exists
"Main Admin deletes campus team pictures"
on storage.objects;


create policy
"Main Admin deletes campus team pictures"
on storage.objects
for delete
to authenticated
using (
  bucket_id =
    'campus-team'

  and
  public.current_campus_role()::text =
    'Main Admin'
);


insert into public.campus_team_members (
  name,
  role,
  image_url,
  website_url,
  linkedin_url,
  display_order,
  is_active
)
values
(
  'Logan Dang',
  'WordPress Developer',
  'https://cdn.21st.dev/assets/localized/a15173e6535b3403cf75d3a251b152b66cb158540ae6fe0cef584477d25c296d.png',
  '#',
  '#',
  10,
  true
),
(
  'Ana Belić',
  'Social Media Specialist',
  'https://cdn.21st.dev/assets/localized/642c6a86e5fbd3b161614c1493159ed72ba9f28fd64bbd3dac1aaf902841acbb.png',
  '#',
  '#',
  20,
  true
),
(
  'Brian Hanley',
  'Product Designer',
  'https://cdn.21st.dev/assets/localized/16f617e9aa4511f685dd437418d90bcb53817ed5031cd822d60db98848ad536f.png',
  '#',
  '#',
  30,
  true
),
(
  'Darko Stanković',
  'UI Designer',
  'https://cdn.21st.dev/assets/localized/90f8eb479a4a56a4da83ebf6be45a9ff73515b0af2cff481f665ea40189a8137.png',
  '#',
  '#',
  40,
  true
)
on conflict (
  name,
  role
)
do nothing;


notify pgrst,
'reload schema';
