
-- =========================================================
-- CAMPUSCONNECT — CAMPUS ACHIEVEMENTS
-- =========================================================

create table if not exists public.campus_achievements (
  id uuid primary key default gen_random_uuid(),

  title text not null
    check (char_length(title) between 3 and 180),

  description text not null default '',

  achievement_type text not null default 'Student'
    check (
      achievement_type in (
        'Student',
        'Faculty',
        'Research',
        'Placement',
        'Sports',
        'Cultural',
        'Hackathon',
        'Competition',
        'Patent',
        'Publication',
        'Startup',
        'Institute'
      )
    ),

  person_name text not null default '',
  department text not null default 'All',

  award_name text not null default '',
  organization text not null default '',

  achievement_date date,

  image_url text,

  external_url text,

  is_featured boolean not null default false,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_by_name text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists
campus_achievements_date_idx
on public.campus_achievements(
  achievement_date desc
);


create index if not exists
campus_achievements_featured_idx
on public.campus_achievements(
  is_featured
);


alter table public.campus_achievements
enable row level security;


grant select
on public.campus_achievements
to authenticated;


grant insert, update, delete
on public.campus_achievements
to authenticated;


drop policy if exists
"Campus reads achievements"
on public.campus_achievements;

create policy
"Campus reads achievements"
on public.campus_achievements
for select
to authenticated
using (true);


drop policy if exists
"Staff create achievements"
on public.campus_achievements;

create policy
"Staff create achievements"
on public.campus_achievements
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  )
);


drop policy if exists
"Staff update achievements"
on public.campus_achievements;

create policy
"Staff update achievements"
on public.campus_achievements
for update
to authenticated
using (
  created_by = auth.uid()
  or public.current_campus_role() = 'Main Admin'
)
with check (
  created_by = auth.uid()
  or public.current_campus_role() = 'Main Admin'
);


drop policy if exists
"Staff delete achievements"
on public.campus_achievements;

create policy
"Staff delete achievements"
on public.campus_achievements
for delete
to authenticated
using (
  created_by = auth.uid()
  or public.current_campus_role() = 'Main Admin'
);

