-- ============================================================
-- CAMPUSCONNECT
-- COORDINATOR — FACULTY EDIT ACCESS
--
-- Main Admin:
--   Add    ✅
--   Edit   ✅
--   Delete ✅
--
-- Coordinator:
--   Add    ❌
--   Edit   ✅
--   Delete ❌
-- ============================================================


alter table public.campus_faculty
enable row level security;


-- Remove this policy if this migration is re-run
drop policy if exists
"Coordinator can edit faculty"
on public.campus_faculty;


create policy
"Coordinator can edit faculty"
on public.campus_faculty
for update
to authenticated
using (
  public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
)
with check (
  public.current_campus_role()
  in (
    'Coordinator',
    'Main Admin'
  )
);


notify pgrst, 'reload schema';
