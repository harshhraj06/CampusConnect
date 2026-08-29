-- =========================================================
-- CAMPUSCONNECT — PROFILE PERMISSION REPAIR
-- =========================================================

-- Ensure RLS remains enabled.
alter table public.profiles
enable row level security;


-- ---------------------------------------------------------
-- TABLE / COLUMN PRIVILEGES
-- ---------------------------------------------------------

grant usage on schema public
to authenticated;

grant select on table public.profiles
to authenticated;

grant update (
  bio,
  skills,
  phone,
  usn,
  avatar_url,
  cover_url,
  updated_at
)
on table public.profiles
to authenticated;


-- ---------------------------------------------------------
-- OWN PROFILE UPDATE POLICY
-- ---------------------------------------------------------

drop policy if exists
  "Users update own profile media"
on public.profiles;

drop policy if exists
  "Users can update own profile"
on public.profiles;

drop policy if exists
  "Authenticated users update own profile"
on public.profiles;


create policy
  "Authenticated users update own profile"
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
)
with check (
  id = (select auth.uid())
);
