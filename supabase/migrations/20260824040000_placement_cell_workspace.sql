-- =========================================================
-- CAMPUSCONNECT — PLACEMENT CELL WORKSPACE
-- =========================================================

create table if not exists public.placement_recruiter_contacts (
  id uuid primary key default gen_random_uuid(),

  company_name text not null,
  recruiter_name text not null,
  designation text not null default '',

  email text not null default '',
  phone text not null default '',
  linkedin_url text,

  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,

  notes text not null default '',

  placement_drive_id uuid
    references public.placement_drives(id)
    on delete set null,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_by_name text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.placement_files (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  company_name text not null default '',

  category text not null default 'Other'
    check (
      category in (
        'Job Description',
        'Shortlist',
        'Offer Letter',
        'Company Policy',
        'MoU',
        'Placement Report',
        'Student Verification',
        'Other'
      )
    ),

  file_name text not null,
  file_path text not null,
  file_type text not null default '',
  mime_type text not null default '',
  file_size bigint not null default 0,

  placement_drive_id uuid
    references public.placement_drives(id)
    on delete set null,

  is_verified boolean not null default false,

  uploaded_by uuid
    references auth.users(id)
    on delete set null,

  uploaded_by_name text not null default '',

  created_at timestamptz not null default now()
);


create table if not exists public.placement_interviews (
  id uuid primary key default gen_random_uuid(),

  placement_drive_id uuid
    references public.placement_drives(id)
    on delete cascade,

  company_name text not null,
  round_name text not null default 'Interview',

  interview_date date not null,
  start_time time,
  end_time time,

  venue text not null default '',
  panel_members text not null default '',

  notes text not null default '',

  status text not null default 'Scheduled'
    check (
      status in (
        'Scheduled',
        'In Progress',
        'Completed',
        'Cancelled'
      )
    ),

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_by_name text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.placement_offers (
  id uuid primary key default gen_random_uuid(),

  placement_drive_id uuid
    references public.placement_drives(id)
    on delete set null,

  student_id uuid
    references auth.users(id)
    on delete set null,

  student_name text not null,
  company_name text not null,
  role_title text not null,

  package_lpa numeric(10,2),

  offer_date date,
  joining_date date,

  status text not null default 'Pending'
    check (
      status in (
        'Pending',
        'Accepted',
        'Declined',
        'Joined'
      )
    ),

  offer_letter_file_id uuid
    references public.placement_files(id)
    on delete set null,

  notes text not null default '',

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_by_name text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists placement_recruiter_contacts_company_idx
on public.placement_recruiter_contacts(company_name);

create index if not exists placement_recruiter_contacts_followup_idx
on public.placement_recruiter_contacts(next_follow_up_at);

create index if not exists placement_files_drive_idx
on public.placement_files(placement_drive_id);

create index if not exists placement_interviews_drive_idx
on public.placement_interviews(placement_drive_id);

create index if not exists placement_offers_company_idx
on public.placement_offers(company_name);


-- =========================================================
-- STORAGE
-- =========================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'placement-files',
  'placement-files',
  false,
  15728640
)
on conflict (id) do nothing;


-- =========================================================
-- RLS
-- =========================================================

alter table public.placement_recruiter_contacts enable row level security;
alter table public.placement_files enable row level security;
alter table public.placement_interviews enable row level security;
alter table public.placement_offers enable row level security;


create or replace function public.can_manage_placements()
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
        'Placement Cell',
        'Main Admin'
      )
  );
$$;


grant execute
on function public.can_manage_placements()
to authenticated;


drop policy if exists "Placement team manage recruiter contacts"
on public.placement_recruiter_contacts;

create policy "Placement team manage recruiter contacts"
on public.placement_recruiter_contacts
for all
to authenticated
using (
  public.can_manage_placements()
)
with check (
  public.can_manage_placements()
);


drop policy if exists "Placement team manage placement files"
on public.placement_files;

create policy "Placement team manage placement files"
on public.placement_files
for all
to authenticated
using (
  public.can_manage_placements()
)
with check (
  public.can_manage_placements()
);


drop policy if exists "Placement team manage interviews"
on public.placement_interviews;

create policy "Placement team manage interviews"
on public.placement_interviews
for all
to authenticated
using (
  public.can_manage_placements()
)
with check (
  public.can_manage_placements()
);


drop policy if exists "Placement team manage offers"
on public.placement_offers;

create policy "Placement team manage offers"
on public.placement_offers
for all
to authenticated
using (
  public.can_manage_placements()
)
with check (
  public.can_manage_placements()
);


drop policy if exists "Placement team upload placement files"
on storage.objects;

create policy "Placement team upload placement files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'placement-files'
  and public.can_manage_placements()
);


drop policy if exists "Placement team read placement files"
on storage.objects;

create policy "Placement team read placement files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'placement-files'
  and public.can_manage_placements()
);


drop policy if exists "Placement team delete placement files"
on storage.objects;

create policy "Placement team delete placement files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'placement-files'
  and public.can_manage_placements()
);
