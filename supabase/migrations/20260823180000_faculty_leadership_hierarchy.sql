-- ============================================================
-- CAMPUSCONNECT
-- FACULTY LEADERSHIP HIERARCHY
-- ============================================================

alter table public.campus_faculty
add column if not exists leadership_role text
default 'Faculty';

alter table public.campus_faculty
add column if not exists domain text;

alter table public.campus_faculty
add column if not exists leadership_priority integer
default 100;


-- Existing HOD records
update public.campus_faculty
set
  leadership_role = 'HOD',
  leadership_priority = 20
where is_hod = true;


-- Normal faculty
update public.campus_faculty
set leadership_role = 'Faculty'
where
  leadership_role is null
  or trim(leadership_role) = '';


-- Remove old constraint if patch is rerun
alter table public.campus_faculty
drop constraint if exists campus_faculty_leadership_role_check;


alter table public.campus_faculty
add constraint campus_faculty_leadership_role_check
check (
  leadership_role in (
    'Dean',
    'HOD',
    'Domain Head',
    'Program Coordinator',
    'Faculty'
  )
);


create index if not exists
campus_faculty_leadership_idx
on public.campus_faculty(
  department,
  leadership_priority,
  display_order
);


notify pgrst, 'reload schema';
