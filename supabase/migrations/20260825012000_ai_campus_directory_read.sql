-- ============================================================
-- CAMPUSCONNECT
-- STUDENT-SAFE ACTIVITY DIRECTORY READ ACCESS
-- ============================================================
--
-- Students need read access to active club/sports directory
-- information for:
--
-- - Activity Center browsing
-- - CampusConnect AI questions
-- - club discovery
-- - sport discovery
--
-- Management permissions remain unchanged.
-- Member/gallery management remains unchanged.
-- ============================================================


drop policy if exists
  "Campus users browse active clubs"
on public.campus_clubs;


create policy
  "Campus users browse active clubs"

on public.campus_clubs

for select

to authenticated

using (
  status <> 'Archived'
);


drop policy if exists
  "Campus users browse active sports"
on public.campus_sports;


create policy
  "Campus users browse active sports"

on public.campus_sports

for select

to authenticated

using (
  status <> 'Archived'
);


notify pgrst, 'reload schema';
