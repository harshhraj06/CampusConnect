-- ============================================================
-- CAMPUSCONNECT — FIX ACTIVITY CENTER CLUB CREATION
-- ============================================================

-- React Activity Center now stores optional video banners.
-- The original campus_clubs table did not contain this column.
alter table public.campus_clubs
add column if not exists video_banner_url text;


-- Keep Activity Center management restricted to
-- Coordinator + Main Admin.
create or replace function public.can_manage_activity_center()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in (
        'Coordinator',
        'Main Admin'
      )
  );
$$;

revoke all
on function public.can_manage_activity_center()
from public;

grant execute
on function public.can_manage_activity_center()
to authenticated;


-- Ensure authorised users can create clubs.
drop policy if exists
"Activity Center coordinators create clubs"
on public.campus_clubs;

create policy
"Activity Center coordinators create clubs"
on public.campus_clubs
for insert
to authenticated
with check (
  public.can_manage_activity_center()
);


-- Authorised users must also be able to read the row returned
-- by .insert(...).select().single()
drop policy if exists
"Activity Center coordinators read clubs"
on public.campus_clubs;

create policy
"Activity Center coordinators read clubs"
on public.campus_clubs
for select
to authenticated
using (
  public.can_manage_activity_center()
);


-- Refresh Supabase/PostgREST schema cache.
notify pgrst, 'reload schema';
