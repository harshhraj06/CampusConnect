-- My Branch expansion: academic details, attachments, featured banners and gallery.
-- Existing entries and data are preserved.

alter table public.branch_hub_entries
  add column if not exists student_photo_path text not null default '',
  add column if not exists cgpa numeric(4,2),
  add column if not exists sgpa numeric(4,2),
  add column if not exists subject_scores jsonb not null default '[]'::jsonb,
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists coordinator_name text not null default '',
  add column if not exists coordinator_contact text not null default '',
  add column if not exists website_url text not null default '',
  add column if not exists additional_links jsonb not null default '[]'::jsonb,
  add column if not exists featured boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'branch_hub_entries_cgpa_range_check'
  ) then
    alter table public.branch_hub_entries
      add constraint branch_hub_entries_cgpa_range_check
      check (cgpa is null or (cgpa >= 0 and cgpa <= 10));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'branch_hub_entries_sgpa_range_check'
  ) then
    alter table public.branch_hub_entries
      add constraint branch_hub_entries_sgpa_range_check
      check (sgpa is null or (sgpa >= 0 and sgpa <= 10));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'branch_hub_entries_subject_scores_array_check'
  ) then
    alter table public.branch_hub_entries
      add constraint branch_hub_entries_subject_scores_array_check
      check (jsonb_typeof(subject_scores) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'branch_hub_entries_attachments_array_check'
  ) then
    alter table public.branch_hub_entries
      add constraint branch_hub_entries_attachments_array_check
      check (jsonb_typeof(attachments) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'branch_hub_entries_additional_links_array_check'
  ) then
    alter table public.branch_hub_entries
      add constraint branch_hub_entries_additional_links_array_check
      check (jsonb_typeof(additional_links) = 'array');
  end if;
end $$;

-- One featured announcement per department.
create table if not exists public.branch_hub_banners (
  department text primary key
    check (char_length(btrim(department)) between 1 and 120),
  title text not null default '' check (char_length(title) <= 160),
  description text not null default '' check (char_length(description) <= 1000),
  image_path text not null default '',
  link_url text not null default '',
  status text not null default 'published'
    check (status in ('published', 'draft')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Separate gallery: each picture has its own title, description and department.
create table if not exists public.branch_hub_gallery (
  id uuid primary key default gen_random_uuid(),
  department text not null
    check (char_length(btrim(department)) between 1 and 120),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  image_path text not null,
  status text not null default 'published'
    check (status in ('published', 'draft')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists branch_hub_gallery_department_created_idx
  on public.branch_hub_gallery (department, status, created_at desc);

alter table public.branch_hub_banners enable row level security;
alter table public.branch_hub_gallery enable row level security;

revoke all on public.branch_hub_banners from anon, authenticated;
revoke all on public.branch_hub_gallery from anon, authenticated;
grant all on public.branch_hub_banners to service_role;
grant all on public.branch_hub_gallery to service_role;

-- Private media storage. The application API will upload files and create
-- time-limited signed URLs. Limit file size to 15 MiB and disallow executable files.
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'my-branch-media',
  'my-branch-media',
  false,
  15728640,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
