-- =========================================================
-- CAMPUSCONNECT
-- ACTIVITY CENTER
-- CLUBS + SPORTS
-- =========================================================


-- =========================================================
-- CLUBS
-- =========================================================

create table if not exists public.campus_clubs (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  short_name text not null default '',

  category text not null default 'Technical',

  description text not null default '',
  tagline text not null default '',

  department text not null default 'All',

  logo_url text,
  banner_url text,
  poster_url text,

  instagram_url text,
  linkedin_url text,
  website_url text,

  contact_email text not null default '',

  founded_year text not null default '',

  status text not null default 'Active'
    check (
      status in (
        'Active',
        'Inactive',
        'Archived'
      )
    ),

  is_featured boolean not null default false,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_by_name text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists
campus_clubs_name_idx
on public.campus_clubs(name);


create index if not exists
campus_clubs_category_idx
on public.campus_clubs(category);


create index if not exists
campus_clubs_featured_idx
on public.campus_clubs(is_featured);



-- =========================================================
-- CLUB TEAM MEMBERS
-- =========================================================

create table if not exists public.campus_club_members (
  id uuid primary key default gen_random_uuid(),

  club_id uuid not null
    references public.campus_clubs(id)
    on delete cascade,

  student_id uuid
    references auth.users(id)
    on delete set null,

  member_name text not null,

  campus_uid text not null default '',

  role_title text not null default 'Member',

  department text not null default '',
  academic_year text not null default '',

  photo_url text,

  bio text not null default '',

  linkedin_url text,
  instagram_url text,

  display_order integer not null default 0,

  is_current boolean not null default true,

  added_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now()
);


create index if not exists
campus_club_members_club_idx
on public.campus_club_members(
  club_id,
  display_order
);



-- =========================================================
-- CLUB GALLERY
-- =========================================================

create table if not exists public.campus_club_gallery (
  id uuid primary key default gen_random_uuid(),

  club_id uuid not null
    references public.campus_clubs(id)
    on delete cascade,

  title text not null,

  description text not null default '',

  image_url text not null,

  activity_date date,

  uploaded_by uuid
    references auth.users(id)
    on delete set null,

  uploaded_by_name text not null default '',

  created_at timestamptz not null default now()
);


create index if not exists
campus_club_gallery_club_idx
on public.campus_club_gallery(
  club_id,
  activity_date desc
);



-- =========================================================
-- SPORTS
-- =========================================================

create table if not exists public.campus_sports (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  sport_type text not null default 'Team',

  description text not null default '',

  tagline text not null default '',

  logo_url text,
  banner_url text,
  poster_url text,

  coach_name text not null default '',

  captain_name text not null default '',

  venue text not null default '',

  practice_schedule text not null default '',

  achievements text not null default '',

  contact_email text not null default '',

  instagram_url text,

  status text not null default 'Active'
    check (
      status in (
        'Active',
        'Inactive',
        'Archived'
      )
    ),

  is_featured boolean not null default false,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_by_name text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);



-- =========================================================
-- SPORTS TEAM MEMBERS
-- =========================================================

create table if not exists public.campus_sport_members (
  id uuid primary key default gen_random_uuid(),

  sport_id uuid not null
    references public.campus_sports(id)
    on delete cascade,

  student_id uuid
    references auth.users(id)
    on delete set null,

  member_name text not null,

  campus_uid text not null default '',

  role_title text not null default 'Player',

  department text not null default '',

  academic_year text not null default '',

  jersey_number text not null default '',

  photo_url text,

  bio text not null default '',

  display_order integer not null default 0,

  is_current boolean not null default true,

  created_at timestamptz not null default now()
);



-- =========================================================
-- SPORTS GALLERY
-- =========================================================

create table if not exists public.campus_sport_gallery (
  id uuid primary key default gen_random_uuid(),

  sport_id uuid not null
    references public.campus_sports(id)
    on delete cascade,

  title text not null,

  description text not null default '',

  image_url text not null,

  activity_date date,

  uploaded_by uuid
    references auth.users(id)
    on delete set null,

  uploaded_by_name text not null default '',

  created_at timestamptz not null default now()
);



-- =========================================================
-- RLS
-- =========================================================

alter table public.campus_clubs
enable row level security;

alter table public.campus_club_members
enable row level security;

alter table public.campus_club_gallery
enable row level security;

alter table public.campus_sports
enable row level security;

alter table public.campus_sport_members
enable row level security;

alter table public.campus_sport_gallery
enable row level security;



-- =========================================================
-- PUBLIC AUTHENTICATED READ
-- =========================================================

drop policy if exists
"Campus clubs readable"
on public.campus_clubs;

create policy
"Campus clubs readable"
on public.campus_clubs
for select
to authenticated
using (true);


drop policy if exists
"Club members readable"
on public.campus_club_members;

create policy
"Club members readable"
on public.campus_club_members
for select
to authenticated
using (true);


drop policy if exists
"Club gallery readable"
on public.campus_club_gallery;

create policy
"Club gallery readable"
on public.campus_club_gallery
for select
to authenticated
using (true);


drop policy if exists
"Sports readable"
on public.campus_sports;

create policy
"Sports readable"
on public.campus_sports
for select
to authenticated
using (true);


drop policy if exists
"Sport members readable"
on public.campus_sport_members;

create policy
"Sport members readable"
on public.campus_sport_members
for select
to authenticated
using (true);


drop policy if exists
"Sport gallery readable"
on public.campus_sport_gallery;

create policy
"Sport gallery readable"
on public.campus_sport_gallery
for select
to authenticated
using (true);



-- =========================================================
-- MANAGEMENT
--
-- Club/Sport content management:
-- Coordinator + Faculty + Main Admin
--
-- We can later introduce individual Club Admin permissions.
-- =========================================================

drop policy if exists
"Staff manage clubs"
on public.campus_clubs;

create policy
"Staff manage clubs"
on public.campus_clubs
for all
to authenticated
using (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Staff manage club members"
on public.campus_club_members;

create policy
"Staff manage club members"
on public.campus_club_members
for all
to authenticated
using (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Staff manage club gallery"
on public.campus_club_gallery;

create policy
"Staff manage club gallery"
on public.campus_club_gallery
for all
to authenticated
using (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Staff manage sports"
on public.campus_sports;

create policy
"Staff manage sports"
on public.campus_sports
for all
to authenticated
using (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Staff manage sport members"
on public.campus_sport_members;

create policy
"Staff manage sport members"
on public.campus_sport_members
for all
to authenticated
using (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Staff manage sport gallery"
on public.campus_sport_gallery;

create policy
"Staff manage sport gallery"
on public.campus_sport_gallery
for all
to authenticated
using (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);



-- =========================================================
-- STORAGE BUCKET
-- =========================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'activity-center',
  'activity-center',
  true,
  10485760
)
on conflict (id)
do update set
  public = true,
  file_size_limit = 10485760;



-- =========================================================
-- STORAGE READ
-- =========================================================

drop policy if exists
"Activity media public read"
on storage.objects;

create policy
"Activity media public read"
on storage.objects
for select
to public
using (
  bucket_id =
  'activity-center'
);



-- =========================================================
-- STORAGE UPLOAD
-- =========================================================

drop policy if exists
"Activity staff upload"
on storage.objects;

create policy
"Activity staff upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id =
    'activity-center'
  and
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);



-- =========================================================
-- STORAGE UPDATE
-- =========================================================

drop policy if exists
"Activity staff update"
on storage.objects;

create policy
"Activity staff update"
on storage.objects
for update
to authenticated
using (
  bucket_id =
    'activity-center'
  and
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
)
with check (
  bucket_id =
    'activity-center'
  and
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);



-- =========================================================
-- STORAGE DELETE
-- =========================================================

drop policy if exists
"Activity staff delete"
on storage.objects;

create policy
"Activity staff delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id =
    'activity-center'
  and
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


notify pgrst, 'reload schema';

