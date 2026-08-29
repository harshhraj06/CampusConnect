-- =========================================================
-- CAMPUSCONNECT PRO
-- PROFESSIONAL RESUME STUDIO
-- =========================================================

create table if not exists public.student_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,

  headline text not null default '',
  summary text not null default '',

  phone text not null default '',
  location text not null default '',

  college text not null default 'RNS Institute of Technology',
  degree text not null default '',
  graduation_year text not null default '',
  cgpa text not null default '',

  skills text not null default '',

  linkedin_url text not null default '',
  github_url text not null default '',
  instagram_url text not null default '',
  portfolio_url text not null default '',
  leetcode_url text not null default '',

  template text not null default 'Modern',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.resume_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null default '',
  technologies text not null default '',
  description text not null default '',

  github_url text not null default '',
  live_url text not null default '',

  display_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.resume_experience (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null default '',
  company text not null default '',
  duration text not null default '',
  description text not null default '',
  company_url text not null default '',

  display_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.resume_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null default '',
  issuer text not null default '',
  achievement_date text not null default '',
  description text not null default '',

  proof_url text not null default '',
  file_path text,

  display_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.resume_certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null default '',
  issuer text not null default '',
  issue_date text not null default '',
  credential_id text not null default '',
  credential_url text not null default '',

  file_path text,

  display_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.resume_custom_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  label text not null,
  url text not null,

  display_order integer not null default 0,

  created_at timestamptz not null default now()
);


-- =========================================================
-- RLS
-- =========================================================

alter table public.student_resumes enable row level security;
alter table public.resume_projects enable row level security;
alter table public.resume_experience enable row level security;
alter table public.resume_achievements enable row level security;
alter table public.resume_certifications enable row level security;
alter table public.resume_custom_links enable row level security;


drop policy if exists "student own resume" on public.student_resumes;
create policy "student own resume"
on public.student_resumes
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


drop policy if exists "student own projects" on public.resume_projects;
create policy "student own projects"
on public.resume_projects
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


drop policy if exists "student own experience" on public.resume_experience;
create policy "student own experience"
on public.resume_experience
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


drop policy if exists "student own achievements" on public.resume_achievements;
create policy "student own achievements"
on public.resume_achievements
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


drop policy if exists "student own certifications" on public.resume_certifications;
create policy "student own certifications"
on public.resume_certifications
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


drop policy if exists "student own resume links" on public.resume_custom_links;
create policy "student own resume links"
on public.resume_custom_links
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


create index if not exists resume_projects_user_idx
on public.resume_projects(user_id);

create index if not exists resume_experience_user_idx
on public.resume_experience(user_id);

create index if not exists resume_achievements_user_idx
on public.resume_achievements(user_id);

create index if not exists resume_certifications_user_idx
on public.resume_certifications(user_id);

create index if not exists resume_custom_links_user_idx
on public.resume_custom_links(user_id);


notify pgrst, 'reload schema';
