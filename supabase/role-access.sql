-- =========================================================
-- CAMPUSCONNECT PRO — ROLE BASED ACCESS
-- =========================================================

-- Account status
alter table public.profiles
add column if not exists account_status text
not null default 'Active'
check (
  account_status in (
    'Active',
    'Suspended',
    'Disabled'
  )
);

-- Staff / institutional information
alter table public.profiles
add column if not exists employee_id text;

alter table public.profiles
add column if not exists coordinator_scope text;

alter table public.profiles
add column if not exists volunteer_scope text;


-- =========================================================
-- CAMPUS ROLE
-- =========================================================

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (
  role in (
    'Student',
    'Faculty',
    'Placement Cell',
    'Coordinator',
    'Volunteer',
    'Main Admin'
  )
);


-- =========================================================
-- GET CURRENT USER ROLE
-- =========================================================

create or replace function public.current_campus_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;


-- =========================================================
-- CHECK WHETHER USER HAS ONE OF GIVEN ROLES
-- =========================================================

create or replace function public.has_campus_role(
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_campus_role() = any(allowed_roles),
    false
  );
$$;


-- =========================================================
-- MAIN ADMIN CHECK
-- =========================================================

create or replace function public.is_campus_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_campus_role() = 'Main Admin';
$$;
