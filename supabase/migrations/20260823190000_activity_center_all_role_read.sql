-- ============================================================
-- CAMPUSCONNECT
-- ACTIVITY CENTER
-- ALL AUTHENTICATED USERS CAN VIEW
-- ONLY COORDINATOR / MAIN ADMIN CAN MANAGE
-- ============================================================


-- ============================================================
-- ENABLE RLS
-- ============================================================

alter table public.campus_clubs
enable row level security;

alter table public.campus_sports
enable row level security;

alter table public.campus_club_members
enable row level security;

alter table public.campus_club_gallery
enable row level security;


-- ============================================================
-- CLUBS — ALL LOGGED-IN USERS CAN READ
-- ============================================================

drop policy if exists
"Activity Center all users read clubs"
on public.campus_clubs;

create policy
"Activity Center all users read clubs"
on public.campus_clubs
for select
to authenticated
using (true);


-- ============================================================
-- SPORTS — ALL LOGGED-IN USERS CAN READ
-- ============================================================

drop policy if exists
"Activity Center all users read sports"
on public.campus_sports;

create policy
"Activity Center all users read sports"
on public.campus_sports
for select
to authenticated
using (true);


-- ============================================================
-- CLUB MEMBERS — ALL LOGGED-IN USERS CAN READ
-- ============================================================

drop policy if exists
"Activity Center all users read members"
on public.campus_club_members;

create policy
"Activity Center all users read members"
on public.campus_club_members
for select
to authenticated
using (true);


-- ============================================================
-- CLUB GALLERY — ALL LOGGED-IN USERS CAN READ
-- ============================================================

drop policy if exists
"Activity Center all users read gallery"
on public.campus_club_gallery;

create policy
"Activity Center all users read gallery"
on public.campus_club_gallery
for select
to authenticated
using (true);


-- ============================================================
-- API REFRESH
-- ============================================================

notify pgrst, 'reload schema';
