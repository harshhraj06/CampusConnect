-- =========================================================
-- CAMPUSCONNECT — PROFESSIONAL PROFILE V2
-- =========================================================

alter table public.profiles
  add column if not exists headline text not null default '';

alter table public.profiles
  add column if not exists linkedin_url text not null default '';

alter table public.profiles
  add column if not exists github_url text not null default '';

alter table public.profiles
  add column if not exists portfolio_url text not null default '';

alter table public.profiles
  add column if not exists semester text not null default '';

alter table public.profiles
  add column if not exists cgpa numeric(4,2);

alter table public.profiles
  add column if not exists location text not null default '';

alter table public.profiles
  add column if not exists profile_visibility text not null default 'campus';

alter table public.profiles
  add column if not exists show_phone boolean not null default false;

alter table public.profiles
  add column if not exists show_email boolean not null default true;

alter table public.profiles
  add column if not exists show_academics boolean not null default true;


-- Validate CGPA without breaking existing rows.
alter table public.profiles
drop constraint if exists profiles_cgpa_check;

alter table public.profiles
add constraint profiles_cgpa_check
check (
  cgpa is null
  or (
    cgpa >= 0
    and cgpa <= 10
  )
);


alter table public.profiles
drop constraint if exists profiles_visibility_check;

alter table public.profiles
add constraint profiles_visibility_check
check (
  profile_visibility in (
    'campus',
    'connections',
    'private'
  )
);


-- =========================================================
-- PROJECTS
-- =========================================================

create table if not exists public.profile_projects (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    references public.profiles(id)
    on delete cascade,

  title text not null,
  description text not null default '',
  tech_stack text not null default '',
  project_url text not null default '',
  github_url text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_projects
enable row level security;


-- =========================================================
-- ACHIEVEMENTS / CERTIFICATIONS
-- =========================================================

create table if not exists public.profile_achievements (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    references public.profiles(id)
    on delete cascade,

  title text not null,
  issuer text not null default '',
  achievement_type text not null default 'Achievement',
  issued_at date,
  credential_url text not null default '',
  description text not null default '',

  created_at timestamptz not null default now()
);

alter table public.profile_achievements
enable row level security;


-- =========================================================
-- PRIVILEGES
-- =========================================================

grant select on public.profile_projects
to authenticated;

grant insert, update, delete
on public.profile_projects
to authenticated;

grant select on public.profile_achievements
to authenticated;

grant insert, update, delete
on public.profile_achievements
to authenticated;


-- Existing profile permissions are intentionally restricted.
grant update (
  bio,
  skills,
  phone,
  usn,
  avatar_url,
  cover_url,
  headline,
  linkedin_url,
  github_url,
  portfolio_url,
  semester,
  cgpa,
  location,
  profile_visibility,
  show_phone,
  show_email,
  show_academics,
  updated_at
)
on public.profiles
to authenticated;


-- =========================================================
-- PROJECT RLS
-- =========================================================

drop policy if exists
  "Users manage own projects"
on public.profile_projects;

create policy
  "Users manage own projects"
on public.profile_projects
for all
to authenticated
using (
  owner_id = (select auth.uid())
)
with check (
  owner_id = (select auth.uid())
);


drop policy if exists
  "Campus reads visible projects"
on public.profile_projects;

create policy
  "Campus reads visible projects"
on public.profile_projects
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = profile_projects.owner_id
      and p.profile_visibility = 'campus'
  )
);


-- =========================================================
-- ACHIEVEMENT RLS
-- =========================================================

drop policy if exists
  "Users manage own achievements"
on public.profile_achievements;

create policy
  "Users manage own achievements"
on public.profile_achievements
for all
to authenticated
using (
  owner_id = (select auth.uid())
)
with check (
  owner_id = (select auth.uid())
);


drop policy if exists
  "Campus reads visible achievements"
on public.profile_achievements;

create policy
  "Campus reads visible achievements"
on public.profile_achievements
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = profile_achievements.owner_id
      and p.profile_visibility = 'campus'
  )
);
