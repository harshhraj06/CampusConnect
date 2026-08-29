-- ============================================================
-- CAMPUSCONNECT
-- ACTIVITY CENTER — COORDINATOR + MAIN ADMIN ONLY
-- ============================================================

-- Allowed roles:
--   Coordinator
--   Main Admin
--
-- Blocked:
--   Student
--   Faculty
--   Placement Cell
--   Volunteer


-- ============================================================
-- HELPER FUNCTION
-- ============================================================

create or replace function public.can_manage_activity_center()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_campus_role()
    in (
      'Coordinator',
      'Main Admin'
    );
$$;

revoke all
on function public.can_manage_activity_center()
from public;

grant execute
on function public.can_manage_activity_center()
to authenticated;


-- ============================================================
-- ENABLE RLS
-- ============================================================

alter table if exists public.campus_clubs
enable row level security;

alter table if exists public.campus_club_members
enable row level security;

alter table if exists public.campus_club_gallery
enable row level security;

alter table if exists public.campus_sports
enable row level security;

alter table if exists public.campus_sport_members
enable row level security;

alter table if exists public.campus_sport_gallery
enable row level security;


-- ============================================================
-- REMOVE ALL OLD POLICIES FROM ACTIVITY CENTER TABLES
--
-- This is intentional.
-- PostgreSQL combines permissive policies with OR.
-- Leaving an older Faculty policy would defeat this lockdown.
-- ============================================================

do $$
declare
  policy_row record;
begin

  for policy_row in
    select
      schemaname,
      tablename,
      policyname
    from pg_policies
    where
      schemaname = 'public'
      and tablename in (
        'campus_clubs',
        'campus_club_members',
        'campus_club_gallery',
        'campus_sports',
        'campus_sport_members',
        'campus_sport_gallery'
      )
  loop

    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );

  end loop;

end $$;


-- ============================================================
-- CLUBS
-- ============================================================

create policy "Activity Center coordinators read clubs"
on public.campus_clubs
for select
to authenticated
using (
  public.can_manage_activity_center()
);


create policy "Activity Center coordinators create clubs"
on public.campus_clubs
for insert
to authenticated
with check (
  public.can_manage_activity_center()
);


create policy "Activity Center coordinators update clubs"
on public.campus_clubs
for update
to authenticated
using (
  public.can_manage_activity_center()
)
with check (
  public.can_manage_activity_center()
);


create policy "Activity Center coordinators delete clubs"
on public.campus_clubs
for delete
to authenticated
using (
  public.can_manage_activity_center()
);


-- ============================================================
-- CLUB MEMBERS
-- ============================================================

create policy "Activity Center coordinators read club members"
on public.campus_club_members
for select
to authenticated
using (
  public.can_manage_activity_center()
);


create policy "Activity Center coordinators create club members"
on public.campus_club_members
for insert
to authenticated
with check (
  public.can_manage_activity_center()
);


create policy "Activity Center coordinators update club members"
on public.campus_club_members
for update
to authenticated
using (
  public.can_manage_activity_center()
)
with check (
  public.can_manage_activity_center()
);


create policy "Activity Center coordinators delete club members"
on public.campus_club_members
for delete
to authenticated
using (
  public.can_manage_activity_center()
);


-- ============================================================
-- CLUB GALLERY
-- ============================================================

create policy "Activity Center coordinators read club gallery"
on public.campus_club_gallery
for select
to authenticated
using (
  public.can_manage_activity_center()
);


create policy "Activity Center coordinators create club gallery"
on public.campus_club_gallery
for insert
to authenticated
with check (
  public.can_manage_activity_center()
);


create policy "Activity Center coordinators update club gallery"
on public.campus_club_gallery
for update
to authenticated
using (
  public.can_manage_activity_center()
)
with check (
  public.can_manage_activity_center()
);


create policy "Activity Center coordinators delete club gallery"
on public.campus_club_gallery
for delete
to authenticated
using (
  public.can_manage_activity_center()
);


-- ============================================================
-- SPORTS
-- ============================================================

create policy "Activity Center coordinators read sports"
on public.campus_sports
for select
to authenticated
using (
  public.can_manage_activity_center()
);


create policy "Activity Center coordinators create sports"
on public.campus_sports
for insert
to authenticated
with check (
  public.can_manage_activity_center()
);


create policy "Activity Center coordinators update sports"
on public.campus_sports
for update
to authenticated
using (
  public.can_manage_activity_center()
)
with check (
  public.can_manage_activity_center()
);


create policy "Activity Center coordinators delete sports"
on public.campus_sports
for delete
to authenticated
using (
  public.can_manage_activity_center()
);


-- ============================================================
-- SPORT MEMBERS
-- Only apply policies if the table exists.
-- ============================================================

do $$
begin

  if to_regclass(
    'public.campus_sport_members'
  ) is not null then

    execute $policy$
      create policy "Activity Center coordinators read sport members"
      on public.campus_sport_members
      for select
      to authenticated
      using (
        public.can_manage_activity_center()
      )
    $policy$;

    execute $policy$
      create policy "Activity Center coordinators create sport members"
      on public.campus_sport_members
      for insert
      to authenticated
      with check (
        public.can_manage_activity_center()
      )
    $policy$;

    execute $policy$
      create policy "Activity Center coordinators update sport members"
      on public.campus_sport_members
      for update
      to authenticated
      using (
        public.can_manage_activity_center()
      )
      with check (
        public.can_manage_activity_center()
      )
    $policy$;

    execute $policy$
      create policy "Activity Center coordinators delete sport members"
      on public.campus_sport_members
      for delete
      to authenticated
      using (
        public.can_manage_activity_center()
      )
    $policy$;

  end if;

end $$;


-- ============================================================
-- SPORT GALLERY
-- ============================================================

do $$
begin

  if to_regclass(
    'public.campus_sport_gallery'
  ) is not null then

    execute $policy$
      create policy "Activity Center coordinators read sport gallery"
      on public.campus_sport_gallery
      for select
      to authenticated
      using (
        public.can_manage_activity_center()
      )
    $policy$;

    execute $policy$
      create policy "Activity Center coordinators create sport gallery"
      on public.campus_sport_gallery
      for insert
      to authenticated
      with check (
        public.can_manage_activity_center()
      )
    $policy$;

    execute $policy$
      create policy "Activity Center coordinators update sport gallery"
      on public.campus_sport_gallery
      for update
      to authenticated
      using (
        public.can_manage_activity_center()
      )
      with check (
        public.can_manage_activity_center()
      )
    $policy$;

    execute $policy$
      create policy "Activity Center coordinators delete sport gallery"
      on public.campus_sport_gallery
      for delete
      to authenticated
      using (
        public.can_manage_activity_center()
      )
    $policy$;

  end if;

end $$;


-- ============================================================
-- STORAGE — ACTIVITY CENTER
--
-- Important:
-- We restrict upload/update/delete.
-- Existing public URLs may remain readable if the bucket is public,
-- which preserves your logo/banner/video/gallery rendering.
-- ============================================================

drop policy if exists
"Activity Center coordinators upload files"
on storage.objects;

drop policy if exists
"Activity Center coordinators update files"
on storage.objects;

drop policy if exists
"Activity Center coordinators delete files"
on storage.objects;


create policy
"Activity Center coordinators upload files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'activity-center'
  and public.can_manage_activity_center()
);


create policy
"Activity Center coordinators update files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'activity-center'
  and public.can_manage_activity_center()
)
with check (
  bucket_id = 'activity-center'
  and public.can_manage_activity_center()
);


create policy
"Activity Center coordinators delete files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'activity-center'
  and public.can_manage_activity_center()
);


-- ============================================================
-- API SCHEMA REFRESH
-- ============================================================

notify pgrst, 'reload schema';
